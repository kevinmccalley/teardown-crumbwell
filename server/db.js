import { randomBytes } from "node:crypto";
import { openPglite, openPostgres } from "./sql.js";
import { createStore } from "./store.js";

// The menu, and the only source of prices. Prices are in euro cents. leadDays: how many days ahead a product
// must be ordered. Images are names of the WebP sets in public/img (see src/images.js).
export const db = {
  products: [
    { id: 1, name: "Country sourdough", note: "48-hour ferment, 900 g", price: 650, image: "sourdough" },
    { id: 2, name: "Butter croissant", note: "Laminated with Normandy butter", price: 240, image: "croissant" },
    { id: 3, name: "Pastéis de nata, box of 6", note: "Baked every morning at 7", price: 900, image: "nata" },
    { id: 4, name: "Cardamom bun", note: "Swedish style, pearl sugar", price: 320, image: "bun" },
    { id: 5, name: "Rosemary focaccia", note: "Olive oil, sea salt, half tray", price: 780, image: "focaccia" },
    { id: 6, name: "Celebration cake", note: "Three layers, serves 12. Order a day ahead", price: 4200, image: "cake", leadDays: 1 },
  ],
};

// Orders live in Postgres. Set DATABASE_URL for a hosted database (required on Vercel). Without it, local
// development uses PGlite in .data/pglite, or in memory with PGLITE_DIR=memory:// (the tests do this).
let store;
export function getStore() {
  return (store ??= openDatabase().then(createStore));
}

async function openDatabase() {
  if (process.env.DATABASE_URL) return openPostgres(process.env.DATABASE_URL);
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Orders need a Postgres database in production.");
  return openPglite(process.env.PGLITE_DIR || ".data/pglite");
}

// 128 random bits as 22 URL-safe characters, so order links can't be guessed or counted.
export function newId() {
  return randomBytes(16).toString("base64url");
}
