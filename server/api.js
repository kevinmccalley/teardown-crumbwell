// API handlers, shared by the Vite dev server and the Vercel functions.
import { db, newId } from "./db.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    if (req.body) return resolve(typeof req.body === "string" ? JSON.parse(req.body) : req.body);
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });

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
    const body = await readBody(req);
    const order = {
      id: newId(),
      name: body.name,
      phone: body.phone,
      email: body.email,
      items: body.items,
      pickupAt: body.pickupAt,
      paid: body.total,
    };
    db.orders.push(order);
    return json(res, 200, order);
  }

  const match = path.match(/^\/orders\/(\d+)$/);
  if (match && req.method === "GET") {
    const order = db.orders.find((o) => o.id === Number(match[1]));
    if (!order) return json(res, 404, { error: "Not found" });
    return json(res, 200, order);
  }

  return json(res, 404, { error: "Not found" });
}
