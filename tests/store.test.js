import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { openPglite, openPostgres } from "../server/sql.js";
import { SlotFullError, createStore } from "../server/store.js";

const order = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2).padEnd(22, "x").slice(0, 22),
  name: "Ana Pereira",
  phone: "+351 912 345 678",
  email: "ana.pereira@example.com",
  pickupAt: "2026-10-23T09:00:00.000Z",
  lines: [{ id: 6, name: "Celebration cake", qty: 1, unitPrice: 4200, lineTotal: 4200 }],
  total: 4200,
  ...overrides,
});

// The same checks run against PGlite (always) and a real Postgres server (when TEST_DATABASE_URL is set).
function storeSuite(name, open) {
  describe(name, () => {
    const stores = [];
    const fresh = async () => {
      const store = createStore(await open());
      stores.push(store);
      await store.ready();
      await store.client.query("delete from orders");
      return store;
    };
    afterAll(async () => {
      for (const s of stores) await s.close();
    });

    it("saves an order and reads it back unchanged", async () => {
      const store = await fresh();
      const o = order();
      await store.insertOrder(o, 6);
      expect(await store.findOrder(o.id)).toEqual(o);
    });

    it("returns null for an unknown id", async () => {
      const store = await fresh();
      expect(await store.findOrder("AAAAAAAAAAAAAAAAAAAAAA")).toBeNull();
    });

    it("counts orders per pickup slot", async () => {
      const store = await fresh();
      await store.insertOrder(order({ pickupAt: "2026-10-23T09:00:00.000Z" }), 6);
      await store.insertOrder(order({ pickupAt: "2026-10-23T09:00:00.000Z" }), 6);
      await store.insertOrder(order({ pickupAt: "2026-10-23T10:00:00.000Z" }), 6);
      const counts = await store.countAt(["2026-10-23T09:00:00.000Z", "2026-10-23T10:00:00.000Z", "2026-10-23T11:00:00.000Z"]);
      expect(counts).toEqual({ "2026-10-23T09:00:00.000Z": 2, "2026-10-23T10:00:00.000Z": 1 });
    });

    it("never overfills a slot when orders arrive at the same time", async () => {
      const store = await fresh();
      const at = "2026-10-24T09:00:00.000Z";
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => store.insertOrder(order({ pickupAt: at }), 6)));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(6);
      const rejected = results.filter((r) => r.status === "rejected");
      expect(rejected).toHaveLength(4);
      for (const r of rejected) expect(r.reason).toBeInstanceOf(SlotFullError);
      expect((await store.countAt([at]))[at]).toBe(6);
    });

    it("refuses bad data at the database level too", async () => {
      const store = await fresh();
      await expect(store.insertOrder(order({ total: -1 }), 6)).rejects.toThrow();
      await expect(store.insertOrder(order({ name: "" }), 6)).rejects.toThrow();
      const o = order();
      await store.insertOrder(o, 6);
      await expect(store.insertOrder({ ...o }, 6)).rejects.toThrow(); // same id twice
    });
  });
}

storeSuite("order store on PGlite", () => openPglite("memory://"));
if (process.env.TEST_DATABASE_URL) storeSuite("order store on Postgres", () => openPostgres(process.env.TEST_DATABASE_URL));

describe("PGlite on disk", () => {
  it("keeps orders after the server restarts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crumbwell-"));
    const dataDir = join(dir, ".data", "pglite"); // folders that don't exist yet, as on a fresh checkout
    try {
      const o = order();
      const first = createStore(await openPglite(dataDir));
      await first.insertOrder(o, 6);
      await first.close();

      const second = createStore(await openPglite(dataDir));
      expect(await second.findOrder(o.id)).toEqual(o);
      await second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000); // creating a database folder takes a few seconds
});
