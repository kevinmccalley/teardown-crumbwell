// In-memory "database" standing in for the Supabase project a Lovable app would use.
const today = new Date();
const pickup = (offset, hour) =>
  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, hour)).toISOString();

export const db = {
  products: [
    { id: 1, name: "Country sourdough", note: "48-hour ferment, 900 g", price: 6.5, image: "/img/sourdough.jpg" },
    { id: 2, name: "Butter croissant", note: "Laminated with Normandy butter", price: 2.4, image: "/img/croissant.jpg" },
    { id: 3, name: "Pastéis de nata, box of 6", note: "Baked every morning at 7", price: 9.0, image: "/img/nata.jpg" },
    { id: 4, name: "Cardamom bun", note: "Swedish style, pearl sugar", price: 3.2, image: "/img/bun.jpg" },
    { id: 5, name: "Rosemary focaccia", note: "Olive oil, sea salt, half tray", price: 7.8, image: "/img/focaccia.jpg" },
    { id: 6, name: "Celebration cake", note: "Three layers, serves 12. Order a day ahead", price: 42.0, image: "/img/cake.jpg" },
  ],
  orders: [
    { id: 1041, name: "Inês Carvalho", phone: "+351 900 000 141", email: "ines.c@example.com", items: [{ id: 6, qty: 1 }], pickupAt: pickup(1, 10), paid: 42.0 },
    { id: 1042, name: "Tomás Ribeiro", phone: "+351 900 000 142", email: "tomas.r@example.com", items: [{ id: 1, qty: 2 }, { id: 2, qty: 4 }], pickupAt: pickup(0, 9), paid: 22.6 },
    { id: 1043, name: "Sofia Mendes", phone: "+351 900 000 143", email: "sofia.m@example.com", items: [{ id: 3, qty: 2 }], pickupAt: pickup(0, 11), paid: 18.0 },
  ],
};

let nextId = 1044;
export const newId = () => nextId++;
