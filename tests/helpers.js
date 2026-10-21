// Calls the API handler directly with a fake request and response.
import { handle } from "../server/api.js";

export async function call(method, url, body) {
  const req = { method, url, body: body === undefined ? undefined : JSON.stringify(body), headers: {} };
  let status = 0;
  let text = "";
  const res = {
    statusCode: 200,
    setHeader() {},
    end(chunk) {
      status = this.statusCode;
      text = chunk ?? "";
    },
  };
  await handle(req, res);
  return { status, body: text ? JSON.parse(text) : null };
}

// A valid order for tomorrow at 10:00 Lisbon time, relative to the (faked) clock.
export const validOrder = (overrides = {}) => ({
  name: "Ana Pereira",
  phone: "+351 912 345 678",
  email: "ana.pereira@example.com",
  items: [{ id: 6, qty: 1 }],
  pickupAt: "2026-10-23T09:00:00.000Z",
  ...overrides,
});
