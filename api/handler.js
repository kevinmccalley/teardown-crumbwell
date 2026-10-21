// Vercel entry point: vercel.json rewrites /api/<path> here as ?p=<path>.
import { handle } from "../server/api.js";

export default function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const p = url.searchParams.get("p") || "";
  url.searchParams.delete("p");
  req.url = "/api/" + p + (url.search || "");
  return handle(req, res);
}
