import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, validOrder } from "./helpers.js";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T09:30:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("order pricing", () => {
  it("prices the order from the server's product list and ignores the browser's total", async () => {
    const { status, body } = await call("POST", "/api/orders", {
      ...validOrder({ items: [{ id: 6, qty: 1 }, { id: 2, qty: 2 }, { id: 3, qty: 1 }] }),
      total: 0.01,
      paid: 0.01,
    });
    expect(status).toBe(201);
    expect(body.total).toBe(5580);
    expect(body.lines).toEqual([
      { id: 6, name: "Celebration cake", qty: 1, unitPrice: 4200, lineTotal: 4200 },
      { id: 2, name: "Butter croissant", qty: 2, unitPrice: 240, lineTotal: 480 },
      { id: 3, name: "Pastéis de nata, box of 6", qty: 1, unitPrice: 900, lineTotal: 900 },
    ]);
    expect(body).not.toHaveProperty("paid");
  });

  it("ignores any price the browser sends for an item", async () => {
    const { body } = await call("POST", "/api/orders", validOrder({ items: [{ id: 1, qty: 1, price: 0 }] }));
    expect(body.total).toBe(650);
  });

  it.each([
    ["an unknown product", [{ id: 999, qty: 1 }]],
    ["a zero quantity", [{ id: 1, qty: 0 }]],
    ["a negative quantity", [{ id: 1, qty: -3 }]],
    ["a fractional quantity", [{ id: 1, qty: 1.5 }]],
    ["a huge quantity", [{ id: 1, qty: 1000 }]],
    ["a quantity sent as text", [{ id: 1, qty: "2" }]],
    ["the same product twice", [{ id: 1, qty: 1 }, { id: 1, qty: 1 }]],
    ["no items", []],
    ["items that aren't a list", "lots"],
  ])("rejects %s", async (_label, items) => {
    const { status, body } = await call("POST", "/api/orders", validOrder({ items }));
    expect(status).toBe(400);
    expect(body.error).toEqual(expect.any(String));
  });

  it("rejects a body that isn't JSON", async () => {
    const req = { method: "POST", url: "/api/orders", body: "{not json", headers: {} };
    const { handle } = await import("../server/api.js");
    let status = 0;
    await handle(req, { statusCode: 200, setHeader() {}, end() { status = this.statusCode; } });
    expect(status).toBe(400);
  });

  it("lists product prices in cents", async () => {
    const { body } = await call("GET", "/api/products");
    expect(body.find((p) => p.id === 2).price).toBe(240);
  });
});
