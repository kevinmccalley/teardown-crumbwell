import { expect, test } from "@playwright/test";
import { axe, placeOrder, withCart } from "./helpers";

test.describe("WCAG 2.2 AA (axe-core)", () => {
  test("menu", async ({ page }) => {
    await withCart(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Today's bakes" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Country sourdough/ })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("checkout", async ({ page }) => {
    await withCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
    await expect(page.getByRole("radio").first()).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("checkout with errors", async ({ page }) => {
    await withCart(page);
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Ana Pereira");
    await page.getByRole("button", { name: /Place order/ }).click();
    const summary = page.getByRole("alert");
    await expect(summary).toContainText("things to fix before you order");
    await expect(summary.getByRole("link", { name: "Phone number" })).toBeVisible();
    await expect(page.getByLabel("Phone")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter a phone number so we can text you when your order is ready.")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("order", async ({ page, request }) => {
    const id = await placeOrder(request);
    await page.goto("/order/" + id);
    await expect(page.getByRole("heading", { level: 1, name: "Thanks, Ana Pereira!" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});

test("the pickup picker works by keyboard", async ({ page }) => {
  await withCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Email").fill("ana.pereira@example.com");
  await page.getByLabel("Email").focus();

  // Tab into the day group, move to the next day with an arrow key.
  await page.keyboard.press("Tab");
  const days = page.getByRole("group", { name: "Day" }).getByRole("radio");
  await expect(days.first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(days.nth(1)).toBeChecked();

  // Tab into the time group and pick the second open time.
  const times = page.getByRole("group", { name: "Time" }).getByRole("radio");
  await expect(times.first()).toBeEnabled();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(times.first()).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(times.nth(1)).toBeChecked();
  await expect(page.getByText(/^Pickup: .+ Lisbon time$/)).toBeVisible();
});
