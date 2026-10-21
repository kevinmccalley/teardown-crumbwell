// Sizes made by scripts/images.mjs from the originals in images/. Shared with the tests.
export const IMAGE_WIDTHS = { product: [400, 800], hero: [800, 1200, 1600] };

export const srcSet = (name, widths) => widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(", ");
