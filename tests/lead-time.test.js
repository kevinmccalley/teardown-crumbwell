import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, validOrder } from "./helpers.js";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // 10:30 in Lisbon on Thursday 22 October 2026
  vi.setSystemTime(new Date("2026-10-22T09:30:00Z"));
});
afterEach(() => vi.useRealTimers());

const TODAY_15 = "2026-10-22T14:00:00.000Z"; // 15:00 Lisbon today
const TOMORROW_8 = "2026-10-23T07:00:00.000Z"; // 8:00 Lisbon tomorrow

describe("celebration cake: order a day ahead", () => {
  it("refuses a cake for pickup today, saying why", async () => {
    const { status, body } = await call("POST", "/api/orders", validOrder({ items: [{ id: 6, qty: 1 }], pickupAt: TODAY_15 }));
    expect(status).toBe(400);
    expect(body.error).toBe("Celebration cake needs to be ordered a day ahead. Choose a pickup time from tomorrow.");
  });

  it("refuses a cake today even alongside other items", async () => {
    const items = [{ id: 2, qty: 2 }, { id: 6, qty: 1 }];
    expect((await call("POST", "/api/orders", validOrder({ items, pickupAt: TODAY_15 }))).status).toBe(400);
  });

  it("accepts a cake for the first slot tomorrow", async () => {
    expect((await call("POST", "/api/orders", validOrder({ items: [{ id: 6, qty: 1 }], pickupAt: TOMORROW_8 }))).status).toBe(201);
  });

  it("still lets other items be picked up today", async () => {
    expect((await call("POST", "/api/orders", validOrder({ items: [{ id: 2, qty: 2 }], pickupAt: TODAY_15 }))).status).toBe(201);
  });

  it("uses the Lisbon date, so a late-night order can't count as a day ahead", async () => {
    // 23:30 UTC on the 22nd is already 00:30 on the 23rd in Lisbon, so "tomorrow" is the 24th.
    vi.setSystemTime(new Date("2026-10-22T23:30:00Z"));
    expect((await call("POST", "/api/orders", validOrder({ items: [{ id: 6, qty: 1 }], pickupAt: TOMORROW_8 }))).status).toBe(400);
    expect((await call("POST", "/api/orders", validOrder({ items: [{ id: 6, qty: 1 }], pickupAt: "2026-10-24T07:00:00.000Z" }))).status).toBe(201);
  });

  it("tells the menu which products need notice", async () => {
    const { body } = await call("GET", "/api/products");
    expect(body.find((p) => p.id === 6).leadDays).toBe(1);
    expect(body.find((p) => p.id === 2).leadDays).toBeUndefined();
  });
});
