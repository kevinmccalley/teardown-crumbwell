import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore
import { handle } from "./server/api.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "crumbwell-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => (req.url?.startsWith("/api/") ? handle(req, res) : next()));
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => (req.url?.startsWith("/api/") ? handle(req, res) : next()));
      },
    },
  ],
});
