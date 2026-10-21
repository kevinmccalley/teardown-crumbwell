import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, validOrder } from "./helpers.js";
import { addDays, formatPickup, formatSlotTime, lisbonDate, slotTimes } from "../server/lisbon.js";

const hours = (isoList) =>
  isoList.map((iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));

describe("Lisbon pickup slots", () => {
  it("makes ten hourly slots from 8:00 to 17:00 Lisbon summer time (UTC+1)", () => {
    const slots = slotTimes("2026-10-24");
    expect(slots).toHaveLength(10);
    expect(slots[0]).toBe("2026-10-24T07:00:00.000Z");
    expect(slots[9]).toBe("2026-10-24T16:00:00.000Z");
  });

  it("stays at 8:00-17:00 on 25 October, the day the clocks go back", () => {
    const slots = slotTimes("2026-10-25");
    expect(slots[0]).toBe("2026-10-25T08:00:00.000Z");
    expect(slots[9]).toBe("2026-10-25T17:00:00.000Z");
    expect(hours(slots)).toEqual(["08", "09", "10", "11", "12", "13", "14", "15", "16", "17"]);
  });

  it("uses Lisbon winter time (UTC+0) after the change", () => {
    expect(slotTimes("2026-10-26")[0]).toBe("2026-10-26T08:00:00.000Z");
  });

  it("handles the spring change too", () => {
    expect(slotTimes("2027-03-27")[0]).toBe("2027-03-27T08:00:00.000Z");
    expect(slotTimes("2027-03-28")[0]).toBe("2027-03-28T07:00:00.000Z");
  });

  it("works out the Lisbon calendar date, not the UTC one", () => {
    // 23:30 UTC on the 24th is 00:30 on the 25th in Lisbon summer time.
    expect(lisbonDate(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  describe.each(["America/Los_Angeles", "Pacific/Auckland", "Asia/Kolkata", "UTC"])("for a customer in %s", (tz) => {
    let saved;
    beforeEach(() => {
      saved = process.env.TZ;
      process.env.TZ = tz;
    });
    afterEach(() => {
      if (saved === undefined) delete process.env.TZ;
      else process.env.TZ = saved;
    });

    it("gives the same slots and shows them in Lisbon time", () => {
      const slots = slotTimes("2026-10-25");
      expect(slots[0]).toBe("2026-10-25T08:00:00.000Z");
      expect(formatSlotTime(slots[0])).toBe("8:00");
      expect(formatSlotTime(slotTimes("2026-10-24")[2])).toBe("10:00");
      expect(formatPickup("2026-10-23T09:00:00.000Z")).toBe("Friday 23 October, 10:00 Lisbon time");
    });
  });
});

describe("slots API", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 10:30 in Lisbon on Thursday 22 October 2026
    vi.setSystemTime(new Date("2026-10-22T09:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("lists the remaining slots for today in Lisbon", async () => {
    const { status, body } = await call("GET", "/api/slots?date=2026-10-22");
    expect(status).toBe(200);
    expect(body[0].at).toBe("2026-10-22T10:00:00.000Z"); // 11:00 Lisbon
    expect(body).toHaveLength(7);
  });

  it("lists all slots for the Sunday the clocks change", async () => {
    vi.setSystemTime(new Date("2026-10-24T09:30:00Z"));
    const { body } = await call("GET", "/api/slots?date=2026-10-25");
    expect(body.map((s) => s.at)).toEqual(slotTimes("2026-10-25"));
  });

  it.each(["", "2026-13-01", "nonsense", "2026-10-30"])("rejects the date %j", async (date) => {
    expect((await call("GET", "/api/slots?date=" + date)).status).toBe(400);
  });

  it("refuses an order for a time that isn't a slot", async () => {
    // 10:00 UTC on the 23rd is 11:00 Lisbon, a real slot; 10:30 UTC is not.
    expect((await call("POST", "/api/orders", validOrder({ pickupAt: "2026-10-23T10:00:00.000Z" }))).status).toBe(201);
    expect((await call("POST", "/api/orders", validOrder({ pickupAt: "2026-10-23T10:30:00.000Z" }))).status).toBe(400);
    // 18:00 Lisbon is closing time, not a slot.
    expect((await call("POST", "/api/orders", validOrder({ pickupAt: "2026-10-23T17:00:00.000Z" }))).status).toBe(400);
  });

  it("marks a slot full after six orders and refuses a seventh", async () => {
    const at = "2026-10-24T13:00:00.000Z"; // 14:00 Lisbon on Saturday
    for (let i = 0; i < 6; i++) expect((await call("POST", "/api/orders", validOrder({ pickupAt: at }))).status).toBe(201);
    const { status, body } = await call("POST", "/api/orders", validOrder({ pickupAt: at }));
    expect(status).toBe(400);
    expect(body.error).toBe("That pickup time has just filled up. Please choose another.");
    const slots = (await call("GET", "/api/slots?date=2026-10-24")).body;
    expect(slots.find((s) => s.at === at).full).toBe(true);
    expect(slots.find((s) => s.at === "2026-10-24T14:00:00.000Z").full).toBe(false);
  });

  it("refuses an order for a slot that has already passed", async () => {
    expect((await call("POST", "/api/orders", validOrder({ pickupAt: "2026-10-22T07:00:00.000Z" }))).status).toBe(400);
  });
});
