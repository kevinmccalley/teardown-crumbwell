import { mkdirSync } from "node:fs";

// Two ways to reach Postgres behind the same small interface:
//   query(text, params) -> rows, exec(sql) for several statements, transaction(fn), close().
// openPostgres is for a hosted database (Neon, Supabase, ...); openPglite is Postgres compiled to
// WebAssembly, for local development and tests ("memory://" or a folder on disk).

export async function openPglite(dataDir) {
  const { PGlite } = await import("@electric-sql/pglite");
  if (!dataDir.includes("://")) mkdirSync(dataDir, { recursive: true }); // PGlite won't create parent folders
  const db = new PGlite(dataDir);
  await db.waitReady;
  const run = (target) => async (text, params) => (await target.query(text, params)).rows;
  return {
    query: run(db),
    exec: (sql) => db.exec(sql),
    transaction: (fn) => db.transaction((tx) => fn(run(tx))),
    close: () => db.close(),
  };
}

export async function openPostgres(connectionString) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString, max: 5 });
  return {
    query: async (text, params) => (await pool.query(text, params)).rows,
    exec: (sql) => pool.query(sql),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn(async (text, params) => (await client.query(text, params)).rows);
        await client.query("commit");
        return result;
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
