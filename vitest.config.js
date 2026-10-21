import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.js"], env: { PGLITE_DIR: "memory://" }, testTimeout: 15_000 },
});
