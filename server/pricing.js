// Prices an order from the server's own product list. Anything price-like the browser sends is ignored.
export const MAX_QTY = 99;

export class OrderError extends Error {}

export function priceItems(items, products) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError("Your cart is empty.");
  const seen = new Set();
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item?.id);
    if (!product) throw new OrderError("One of the items is no longer on the menu.");
    if (seen.has(product.id)) throw new OrderError("An item appears twice in the order.");
    seen.add(product.id);
    const qty = item.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new OrderError(`Choose between 1 and ${MAX_QTY} of ${product.name}.`);
    }
    return { id: product.id, name: product.name, qty, unitPrice: product.price, lineTotal: product.price * qty };
  });
  return { lines, total: lines.reduce((sum, l) => sum + l.lineTotal, 0) };
}
