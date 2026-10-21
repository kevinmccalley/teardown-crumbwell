import { randomBytes } from "node:crypto";
import { addDays, lisbonDate, lisbonTime } from "./lisbon.js";
import { priceItems } from "./pricing.js";

// Prices are in euro cents. leadDays: how many days ahead a product must be ordered. Images are names of the WebP sets in public/img (see src/images.js).
// In-memory "database" standing in for the Supabase project a Lovable app would use.
const pickup = (offset, hour) => lisbonTime(addDays(lisbonDate(), offset), hour).toISOString();

export const db = {
  products: [
    { id: 1, name: "Country sourdough", note: "48-hour ferment, 900 g", price: 650, image: "sourdough" },
    { id: 2, name: "Butter croissant", note: "Laminated with Normandy butter", price: 240, image: "croissant" },
    { id: 3, name: "Pastéis de nata, box of 6", note: "Baked every morning at 7", price: 900, image: "nata" },
    { id: 4, name: "Cardamom bun", note: "Swedish style, pearl sugar", price: 320, image: "bun" },
    { id: 5, name: "Rosemary focaccia", note: "Olive oil, sea salt, half tray", price: 780, image: "focaccia" },
    { id: 6, name: "Celebration cake", note: "Three layers, serves 12. Order a day ahead", price: 4200, image: "cake", leadDays: 1 },
  ],
  orders: [],
};

const seed = (name, phone, email, items, pickupAt) => ({ id: newId(), name, phone, email, pickupAt, ...priceItems(items, db.products) });
db.orders.push(
  seed("Inês Carvalho", "+351 900 000 141", "ines.c@example.com", [{ id: 6, qty: 1 }], pickup(1, 10)),
  seed("Tomás Ribeiro", "+351 900 000 142", "tomas.r@example.com", [{ id: 1, qty: 2 }, { id: 2, qty: 4 }], pickup(0, 9)),
  seed("Sofia Mendes", "+351 900 000 143", "sofia.m@example.com", [{ id: 3, qty: 2 }], pickup(0, 11)),
);

// 128 random bits as 22 URL-safe characters, so order links can't be guessed or counted.
export function newId() {
  return randomBytes(16).toString("base64url");
}
