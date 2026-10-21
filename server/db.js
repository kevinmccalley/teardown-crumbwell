import { randomBytes } from "node:crypto";
import { openPglite, openPostgres } from "./sql.js";
import { createStore } from "./store.js";
import { products } from "./products.js";

// Prices for orders always come from this list on the server (see pricing.js).
export const db = { products };

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
