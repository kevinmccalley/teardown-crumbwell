// API handlers, shared by the Vite dev server and the Vercel functions.
import { db, newId } from "./db.js";
import { addDays, bookableDates, isDate, lisbonDate, slotTimes } from "./lisbon.js";
import { OrderError, priceItems } from "./pricing.js";

// Orders one pickup slot can take before it shows as full.
export const SLOT_CAPACITY = 6;

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const parse = (text) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new OrderError("The order couldn't be read. Please try again.");
  }
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      try {
        return resolve(typeof req.body === "string" ? parse(req.body) : req.body);
      } catch (e) {
        return reject(e);
      }
    }
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Checks the customer's details and prices the items. Throws OrderError with a message for the customer.
function buildOrder(body) {
  const name = text(body.name, 100);
  const phone = text(body.phone, 30);
  const email = text(body.email, 200);
  if (!name) throw new OrderError("Enter your full name.");
  if ((phone.match(/\d/g) || []).length < 7 || !/^\+?[\d\s().-]+$/.test(phone)) {
    throw new OrderError("Enter a phone number so we can text you when your order is ready.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OrderError("Enter an email address, like name@example.com.");
  const { lines, total } = priceItems(body.items, db.products);
  const pickupAt = checkPickup(body.pickupAt);
  checkLeadTime(lines, pickupAt);
  return { name, phone, email, pickupAt, lines, total };
}

// Some products (the celebration cake) must be ordered days ahead, counted in Lisbon calendar days.
function checkLeadTime(lines, pickupAt) {
  const pickupDate = lisbonDate(new Date(pickupAt));
  for (const line of lines) {
    const leadDays = db.products.find((p) => p.id === line.id).leadDays || 0;
    if (pickupDate < addDays(lisbonDate(), leadDays)) {
      const ahead = leadDays === 1 ? "a day ahead" : `${leadDays} days ahead`;
      const from = leadDays === 1 ? "tomorrow" : "a later day";
      throw new OrderError(`${line.name} needs to be ordered ${ahead}. Choose a pickup time from ${from}.`);
    }
  }
}

const bookedAt = (at) => db.orders.filter((o) => o.pickupAt === at).length;

// The pickup time must be one of the slots still to come on a bookable day, with room left.
function checkPickup(at) {
  const instant = typeof at === "string" ? new Date(at) : null;
  const iso = instant && !isNaN(instant) ? instant.toISOString() : "";
  const date = iso && lisbonDate(instant);
  if (!iso || !bookableDates().includes(date) || !slotTimes(date).includes(iso) || instant.getTime() <= Date.now()) {
    throw new OrderError("Choose one of the pickup times shown.");
  }
  if (bookedAt(iso) >= SLOT_CAPACITY) throw new OrderError("That pickup time has just filled up. Please choose another.");
  return iso;
}

export async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api/, "");

  if (path === "/products" && req.method === "GET") {
    return json(res, 200, db.products);
  }

  // Shop is open 8:00-18:00 Lisbon time, hourly pickup slots. Lists the slots still to come on a bookable date.
  if (path === "/slots" && req.method === "GET") {
    const date = url.searchParams.get("date");
    if (!isDate(date) || !bookableDates().includes(date)) return json(res, 400, { error: "Choose today or one of the next two days." });
    const now = Date.now();
    const slots = slotTimes(date)
      .filter((at) => Date.parse(at) > now)
      .map((at) => ({ at, full: bookedAt(at) >= SLOT_CAPACITY }));
    return json(res, 200, slots);
  }

  if (path === "/orders" && req.method === "POST") {
    try {
      const order = { id: newId(), ...buildOrder(await readBody(req)) };
      db.orders.push(order);
      return json(res, 201, order);
    } catch (e) {
      if (e instanceof OrderError) return json(res, 400, { error: e.message });
      throw e;
    }
  }

  const match = path.match(/^\/orders\/([A-Za-z0-9_-]{22})$/);
  if (match && req.method === "GET") {
    const order = db.orders.find((o) => o.id === match[1]);
    if (!order) return json(res, 404, { error: "Not found" });
    return json(res, 200, order);
  }

  return json(res, 404, { error: "Not found" });
}
