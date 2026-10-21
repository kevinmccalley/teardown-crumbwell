import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, validOrder } from "./helpers.js";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T09:30:00Z"));
});
afterEach(() => vi.useRealTimers());

const ID = /^[A-Za-z0-9_-]{22}$/;

describe("order ids", () => {
  it("gives each new order a random, unguessable id", async () => {
    const a = (await call("POST", "/api/orders", validOrder())).body;
    const b = (await call("POST", "/api/orders", validOrder())).body;
    expect(a.id).toMatch(ID);
    expect(b.id).toMatch(ID);
    expect(a.id).not.toBe(b.id);
  });

  it("finds an order by its id", async () => {
    const created = (await call("POST", "/api/orders", validOrder())).body;
    const { status, body } = await call("GET", "/api/orders/" + created.id);
    expect(status).toBe(200);
    expect(body.name).toBe("Ana Pereira");
  });

  it("does not answer to counting numbers", async () => {
    for (const n of [1, 1041, 1042, 1043, 1044, 1045]) {
      expect((await call("GET", "/api/orders/" + n)).status).toBe(404);
    }
  });

  it("returns 404 for an id that doesn't exist", async () => {
    expect((await call("GET", "/api/orders/AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404);
  });
});
