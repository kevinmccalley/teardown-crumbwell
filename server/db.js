import { priceItems } from "./pricing.js";

// Prices are in euro cents.
// In-memory "database" standing in for the Supabase project a Lovable app would use.
const today = new Date();
const pickup = (offset, hour) =>
  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, hour)).toISOString();

export const db = {
  products: [
    { id: 1, name: "Country sourdough", note: "48-hour ferment, 900 g", price: 650, image: "/img/sourdough.jpg" },
    { id: 2, name: "Butter croissant", note: "Laminated with Normandy butter", price: 240, image: "/img/croissant.jpg" },
    { id: 3, name: "Pastéis de nata, box of 6", note: "Baked every morning at 7", price: 900, image: "/img/nata.jpg" },
    { id: 4, name: "Cardamom bun", note: "Swedish style, pearl sugar", price: 320, image: "/img/bun.jpg" },
    { id: 5, name: "Rosemary focaccia", note: "Olive oil, sea salt, half tray", price: 780, image: "/img/focaccia.jpg" },
    { id: 6, name: "Celebration cake", note: "Three layers, serves 12. Order a day ahead", price: 4200, image: "/img/cake.jpg" },
  ],
  orders: [],
};

const seed = (id, name, phone, email, items, pickupAt) => ({ id, name, phone, email, pickupAt, ...priceItems(items, db.products) });
db.orders.push(
  seed(1041, "Inês Carvalho", "+351 900 000 141", "ines.c@example.com", [{ id: 6, qty: 1 }], pickup(1, 10)),
  seed(1042, "Tomás Ribeiro", "+351 900 000 142", "tomas.r@example.com", [{ id: 1, qty: 2 }, { id: 2, qty: 4 }], pickup(0, 9)),
  seed(1043, "Sofia Mendes", "+351 900 000 143", "sofia.m@example.com", [{ id: 3, qty: 2 }], pickup(0, 11)),
);

let nextId = 1044;
export const newId = () => nextId++;
