import { expect, test, type Locator, type Page } from "@playwright/test";
import { withCart } from "./helpers";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

// True when the button is inside the viewport and is the top element at its centre.
async function isUncovered(page: Page, button: Locator) {
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) return false;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && el.contains(top);
  });
}

const bar = (page: Page) => page.locator(".place");

test.describe("checkout on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await withCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("radio").first()).toBeVisible();
  });

  test("has no cart bar", async ({ page }) => {
    await expect(page.getByRole("link", { name: "View cart" })).toHaveCount(0);
  });

  test("keeps Place order on screen and uncovered while scrolling", async ({ page }) => {
    const button = page.getByRole("button", { name: /Place order/ });
    for (const y of [0, 400, 800, 100_000]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      expect(await isUncovered(page, button), `scrolled to ${y}`).toBe(true);
    }
  });

  test("shows the total next to the button", async ({ page }) => {
    await expect(bar(page)).toContainText("Total");
    await expect(bar(page)).toContainText("€55.80");
  });

  test("doesn't hide the end of the page behind the bar", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const note = await page.getByText("You pay at the counter").boundingBox();
    const barBox = await bar(page).boundingBox();
    expect(note!.y + note!.height).toBeLessThanOrEqual(barBox!.y);
  });

  test("doesn't hide a focused field behind the bar", async ({ page }) => {
    await page.getByRole("button", { name: /Place order/ }).click();
    await page.getByRole("alert").getByRole("link", { name: "Pickup time" }).click();
    const focused = await page.evaluate(() => {
      const r = document.activeElement!.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    const barBox = await bar(page).boundingBox();
    expect(focused.bottom).toBeLessThanOrEqual(barBox!.y);
  });

  test("a time slot can be tapped", async ({ page }) => {
    await page.getByRole("radio", { name: /Tomorrow/ }).check(); // today may have no slots left
    const slot = page.getByRole("group", { name: "Time" }).getByRole("radio").first();
    await slot.scrollIntoViewIfNeeded();
    await slot.check();
    await expect(slot).toBeChecked();
  });
});

test("the menu still shows the cart bar without covering the footer", async ({ page }) => {
  await withCart(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "View cart" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const credits = await page.getByText(/^Photos from Unsplash/).boundingBox();
  const cartbar = await page.locator(".cartbar").boundingBox();
  expect(credits!.y + credits!.height).toBeLessThanOrEqual(cartbar!.y);
});
