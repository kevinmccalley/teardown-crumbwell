// API handlers, shared by the Vite dev server and the Vercel functions.
import { db, newId } from "./db.js";
import { OrderError, priceItems } from "./pricing.js";

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
  return { name, phone, email, pickupAt: body.pickupAt, lines, total };
}

export async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api/, "");

  if (path === "/products" && req.method === "GET") {
    return json(res, 200, db.products);
  }

  // Shop is open 8:00-18:00, hourly pickup slots
  if (path === "/slots" && req.method === "GET") {
    const [y, m, d] = (url.searchParams.get("date") || "").split("-").map(Number);
    const slots = [];
    for (let h = 8; h < 18; h++) slots.push(new Date(Date.UTC(y, m - 1, d, h)).toISOString());
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
