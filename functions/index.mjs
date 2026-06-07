/**
 * KøbSmart API — Cloud Function (2nd gen).
 *
 * Runs the EXACT same request handler as the local `server.mjs` (apiHandler),
 * so production behaviour matches `node server.mjs` for all routes:
 *   /api/health, /api/recipes/deepseek, /api/recipes/verify-matches,
 *   /api/recipes/sources, /api/route/openmaps
 *
 * Mounted at /api/** via the Hosting rewrite in firebase.json — same-origin,
 * so the React app's existing fetch("/api/...") calls work unchanged.
 *
 * Config:
 *   - DEEPSEEK_API_KEY: Firebase secret, injected as an env var at runtime
 *     (server.mjs reads process.env.DEEPSEEK_API_KEY).
 *   - GOOGLE_MAPS_API_KEY: optional. When configured, server.mjs prefers Google
 *     Routes; otherwise it uses transport-aware open routing.
 *   - RECIPE_SOURCE_CACHE: set to /tmp/... in functions/.env because the
 *     Cloud Functions filesystem is read-only except /tmp.
 *
 * server.mjs + recipe_sources.mjs are vendored into this dir by the functions
 * `predeploy` hook in firebase.json (canonical source stays at the app root).
 */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { apiHandler } from "./server.mjs";

const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");

export const api = onRequest(
  {
    region: "europe-west1",
    secrets: [DEEPSEEK_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  (req, res) => apiHandler(req, res)
);
