// Makes resized WebP copies of the original photos in images/ for public/img. Run: npm run images
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { IMAGE_WIDTHS } from "../src/images.js";

const src = fileURLToPath(new URL("../images/", import.meta.url));
const out = fileURLToPath(new URL("../public/img/", import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of readdirSync(src).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
  const name = file.replace(/\.[^.]+$/, "");
  const widths = name === "hero" ? IMAGE_WIDTHS.hero : IMAGE_WIDTHS.product;
  for (const w of widths) {
    const info = await sharp(src + file)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(`${out}${name}-${w}.webp`);
    console.log(`${name}-${w}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
  }
}
