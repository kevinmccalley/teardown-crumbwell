// Orders in Postgres. Works with any client from sql.js.
export class SlotFullError extends Error {}

const SCHEMA = `
  create table if not exists orders (
    id text primary key check (length(id) = 22),
    name text not null check (name <> ''),
    phone text not null check (phone <> ''),
    email text not null check (email <> ''),
    pickup_at timestamptz not null,
    lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) > 0),
    total integer not null check (total >= 0),
    created_at timestamptz not null default now()
  );
  create index if not exists orders_pickup_at on orders (pickup_at);
`;

const toOrder = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  pickupAt: new Date(row.pickup_at).toISOString(),
  lines: typeof row.lines === "string" ? JSON.parse(row.lines) : row.lines,
  total: row.total,
});

export function createStore(client) {
  let schema;
  const ready = () => (schema ??= client.exec(SCHEMA));

  return {
    client,
    ready,

    // Saves an order unless its pickup slot already has `capacity` orders. The per-slot lock makes
    // orders for the same slot take turns, so two customers can't both get the last place.
    async insertOrder(order, capacity) {
      await ready();
      return client.transaction(async (q) => {
        await q("select pg_advisory_xact_lock(hashtext($1))", [order.pickupAt]);
        const [{ n }] = await q("select count(*)::int as n from orders where pickup_at = $1", [order.pickupAt]);
        if (n >= capacity) throw new SlotFullError("Slot is full");
        await q(
          "insert into orders (id, name, phone, email, pickup_at, lines, total) values ($1, $2, $3, $4, $5, $6, $7)",
          [order.id, order.name, order.phone, order.email, order.pickupAt, JSON.stringify(order.lines), order.total],
        );
        return order;
      });
    },

    async findOrder(id) {
      await ready();
      const [row] = await client.query("select * from orders where id = $1", [id]);
      return row ? toOrder(row) : null;
    },

    // Orders booked at each of the given pickup times, as { iso: count } (times with none are left out).
    async countAt(times) {
      await ready();
      const rows = await client.query(
        `select pickup_at, count(*)::int as n from orders
         where pickup_at in (select jsonb_array_elements_text($1::jsonb)::timestamptz)
         group by pickup_at`,
        [JSON.stringify(times)],
      );
      return Object.fromEntries(rows.map((r) => [new Date(r.pickup_at).toISOString(), r.n]));
    },

    close: () => client.close(),
  };
}
