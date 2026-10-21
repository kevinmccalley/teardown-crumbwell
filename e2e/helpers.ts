import type { APIRequestContext, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
// @ts-ignore
import { bookableDates } from "../server/lisbon.js";

export const CART = { 6: 1, 2: 2, 3: 1 }; // the order in the Penpot design, €55.80

export async function withCart(page: Page, cart: Record<number, number> = CART) {
  await page.addInitScript((c) => window.localStorage.setItem("cart", JSON.stringify(c)), cart);
}

export async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}

// Places an order through the API for the first open slot and returns its id.
export async function placeOrder(request: APIRequestContext) {
  for (const date of bookableDates()) {
    const slots = await (await request.get("/api/slots?date=" + date)).json();
    const slot = slots.find((s: { full: boolean }) => !s.full);
    if (!slot) continue;
    const res = await request.post("/api/orders", {
      data: {
        name: "Ana Pereira",
        phone: "+351 912 345 678",
        email: "ana.pereira@example.com",
        items: Object.entries(CART).map(([id, qty]) => ({ id: Number(id), qty })),
        pickupAt: slot.at,
      },
    });
    return (await res.json()).id as string;
  }
  throw new Error("No open pickup slot");
}
