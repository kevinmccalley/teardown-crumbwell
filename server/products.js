// The menu, shared by the server and the page, and the only source of prices. Prices are in euro cents.
// leadDays: how many days ahead a product must be ordered. Images are names of the WebP sets in public/img
// (see src/images.js).
export const products = [
  { id: 1, name: "Country sourdough", note: "48-hour ferment, 900 g", price: 650, image: "sourdough" },
  { id: 2, name: "Butter croissant", note: "Laminated with Normandy butter", price: 240, image: "croissant" },
  { id: 3, name: "Pastéis de nata, box of 6", note: "Baked every morning at 7", price: 900, image: "nata" },
  { id: 4, name: "Cardamom bun", note: "Swedish style, pearl sugar", price: 320, image: "bun" },
  { id: 5, name: "Rosemary focaccia", note: "Olive oil, sea salt, half tray", price: 780, image: "focaccia" },
  { id: 6, name: "Celebration cake", note: "Three layers, serves 12. Order a day ahead", price: 4200, image: "cake", leadDays: 1 },
];
