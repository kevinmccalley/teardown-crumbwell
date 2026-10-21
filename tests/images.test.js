import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { db } from "../server/db.js";
import { IMAGE_WIDTHS } from "../src/images.js";

const dir = new URL("../public/img/", import.meta.url);
const files = readdirSync(dir);

describe("product photos", () => {
  it("serves only WebP from public/img", () => {
    expect(files.filter((f) => !f.endsWith(".webp"))).toEqual([]);
  });

  it("has every size of every photo", () => {
    const names = [...db.products.map((p) => p.image), "hero"];
    for (const name of names) {
      const widths = name === "hero" ? IMAGE_WIDTHS.hero : IMAGE_WIDTHS.product;
      for (const w of widths) expect(files).toContain(`${name}-${w}.webp`);
    }
  });

  it("keeps all of public/img under 1 MB (it was 5 MB of JPEGs)", () => {
    const total = files.reduce((sum, f) => sum + statSync(new URL(f, dir)).size, 0);
    expect(total).toBeLessThan(1024 * 1024);
  });
});
