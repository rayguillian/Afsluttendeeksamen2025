// KøbSmart local API server (zero dependencies).
//
// Keeps API keys server-side and proxies routing so the browser never holds a
// secret. Vite proxies /api/* here in dev; in prod you can serve the built
// `dist/` from this same process.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { enrichMealsWithRecipeSources } from './recipe_sources.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
loadDotEnv(join(root, '.env'));

const PORT = Number(process.env.API_PORT || 5174);
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
// Cheap model for the audit/verification pass (StrangeLoop "small model" idea).
const DEEPSEEK_SMALL_MODEL = process.env.DEEPSEEK_SMALL_MODEL || DEEPSEEK_MODEL;
const OSRM_URL = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const OSRM_PROFILE_URLS = {
  driving: (process.env.OSRM_DRIVING_URL || OSRM_URL).replace(/\/$/, ''),
  cycling: (process.env.OSRM_CYCLING_URL || 'https://routing.openstreetmap.de/routed-bike').replace(/\/$/, ''),
  walking: (process.env.OSRM_WALKING_URL || 'https://routing.openstreetmap.de/routed-foot').replace(/\/$/, ''),
};
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_ROUTES_URL =
  process.env.GOOGLE_ROUTES_URL || 'https://routes.googleapis.com/directions/v2:computeRoutes';
const DIST = join(root, 'dist');

const DEEPSEEK_SYSTEM_PROMPT = `You generate practical, budget-aware weeknight recipes for Danish grocery shoppers.
Return ONLY valid JSON with this exact shape:
{
  "meals": [
    {
      "name": "string (Danish or descriptive name)",
      "cuisine": "string matching the requested cuisine",
      "dietTags": ["vegetarian"|"vegan"|"pescetarian"|"high-protein"|"low-carb"],
      "time": 30,
      "difficulty": "easy"|"medium"|"hard",
      "servings": 2,
      "description": "one short practical sentence",
      "steps": ["short step", "short step"],
      "sources": [{"title":"KøbSmart AI recipe","url":"","rating":3,"difficulty":"easy"}],
      "ingredients": [
        {"name": "Kyllingebryst", "amount": "450 g", "category": "meat", "keywords": ["kylling", "kyllingebryst", "kyllingefilet"]}
      ]
    }
  ]
}
Rules:
- Generate exactly preferences.recipeCount distinct meals (between 1 and 4; default 4) for the requested cuisine or cuisines and meal occasion.
- If preferences.cuisineTargets is present, follow its exact cuisine/count distribution. Example: [{"cuisine":"Italian","count":2},{"cuisine":"Japanese","count":2}] means exactly two meals for each cuisine.
- If preferences.repairRequest is true, this is a focused repair pass. Generate only the requested missing cuisineTargets and avoid every name in preferences.existingRecipeNames.
- When preferences.rejectionReasons is present, revise the recipes so none of those failures recur. Never loosen the user's limits.
- STRICTLY keep every meal at or below preferences.maxTime minutes and preferences.maxIngredients ingredients.
- STRICTLY keep difficulty at or below preferences.maxDifficulty ("Nem", "Mellem", or "Udfordrende").
- Respect dietary preferences and STRICTLY avoid every listed allergy.
- Also STRICTLY avoid any free-text "customAvoids" terms from the user.
- If dietaryPreferences/allergies/customAvoids mention no-pork, halal, kosher, svinekød, pork, bacon, ham, skinke, pancetta, chorizo, salami or alcohol, do NOT include pork products or alcohol-based ingredients.
- Prefer pantryItems the user already has at home when practical, but still include them in the ingredient list so the app can mark them as "har hjemme".
- Prefer products and Danish search terms that appear in the supplied offer list.
- Every ingredient MUST include 1-4 lowercase Danish "keywords" that can match offer product names (e.g. kylling, hakket oksekoed, ris, pasta, tomat, loeg, hvidloeg, skyr, laks, rejer, kartofler, broccoli, ost, fløde).
- Include one source object. If the recipe is generated rather than copied from a real URL, use title "KøbSmart AI recipe" and url "".
- Keep meals realistic for 2 servings on a tight budget.
- Output JSON only, no markdown, no commentary.`;

export async function apiHandler(req, res) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health') {
      return sendJson(res, {
        ok: true,
        deepseek: Boolean(DEEPSEEK_KEY),
        osrm: true,
        googleRoutes: Boolean(GOOGLE_MAPS_KEY),
        routingProvider: GOOGLE_MAPS_KEY ? 'google' : 'openmaps',
      });
    }

    if (url.pathname === '/api/recipes/deepseek') {
      if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
      return handleDeepseek(req, res);
    }

    if (url.pathname === '/api/recipes/verify-matches') {
      if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
      return handleVerifyMatches(req, res);
    }

    if (url.pathname === '/api/recipes/sources') {
      if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
      return handleRecipeSources(req, res);
    }

    if (url.pathname === '/api/route/openmaps') {
      if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405);
      return handleRoute(req, res);
    }

    if (url.pathname.startsWith('/api/')) {
      return sendJson(res, { error: 'Not found' }, 404);
    }

    // Optionally serve the built SPA (npm run build first).
    return serveStatic(url.pathname, res);
  } catch (error) {
    return sendJson(res, { error: error?.message || 'Server error' }, 500);
  }
}

// Run as a standalone local server only when executed directly
// (`node server.mjs`). When imported by the Cloud Function wrapper this stays
// dormant — the function drives apiHandler itself.
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || '').href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const server = createServer(apiHandler);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`KøbSmart API on http://127.0.0.1:${PORT}`);
    console.log(DEEPSEEK_KEY ? '  DeepSeek: enabled' : '  DeepSeek: DISABLED (set DEEPSEEK_API_KEY in .env)');
    console.log(GOOGLE_MAPS_KEY ? '  Routing: Google Routes + open fallback' : '  Routing: transport-aware open maps');
  });
}

// ---------------------------------------------------------------- DeepSeek ---

async function handleDeepseek(req, res) {
  if (!DEEPSEEK_KEY) {
    return sendJson(res, { error: 'recipe_generation_unavailable', detail: 'DEEPSEEK_API_KEY is not set.' }, 503);
  }

  const payload = JSON.parse((await readBody(req)) || '{}');
  const preferences = { ...(payload.preferences || {}) };
  preferences.recipeCount = Math.min(4, Math.max(1, Number(preferences.recipeCount) || 4));
  // Cap the offer context so the prompt stays small and cheap.
  const nearbyOffers = Array.isArray(payload.nearbyOffers) ? payload.nearbyOffers.slice(0, 160) : [];

  let completion;
  try {
    completion = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.45,
        // Four focused meals fit comfortably while leaving room for complete
        // ingredients and cooking steps.
        max_tokens: 6000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ preferences, nearbyOffers }) },
        ],
      }),
    });
  } catch (error) {
    return sendJson(res, { error: 'deepseek_unreachable', detail: error.message }, 502);
  }

  const text = await completion.text();
  if (!completion.ok) {
    return sendJson(res, { error: 'deepseek_error', detail: `${completion.status}: ${text.slice(0, 240)}` }, 502);
  }

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return sendJson(res, { error: 'deepseek_bad_response', detail: 'Unparseable DeepSeek envelope.' }, 502);
  }
  const choice = envelope.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    return sendJson(res, { error: 'deepseek_empty', detail: 'No recipe content returned.' }, 502);
  }

  let parsed;
  try {
    parsed = parseModelJson(content);
  } catch (error) {
    const finish = choice?.finish_reason ? ` DeepSeek finish reason: ${choice.finish_reason}.` : '';
    return sendJson(
      res,
      {
        error: 'deepseek_bad_json',
        detail: `DeepSeek returned an incomplete or invalid recipe response.${finish} Please try again.`,
      },
      502,
    );
  }

  const meals = (Array.isArray(parsed.meals) ? parsed.meals : [])
    .filter((meal) => meal && typeof meal.name === 'string' && Array.isArray(meal.ingredients))
    .slice(0, preferences.recipeCount);
  if (!meals.length) {
    return sendJson(res, { error: 'deepseek_empty', detail: 'DeepSeek returned no usable recipes. Please try again.' }, 502);
  }
  const enrichedMeals = await enrichMealsWithRecipeSources(meals, preferences);
  return sendJson(res, { meals: enrichedMeals });
}

async function handleRecipeSources(req, res) {
  const payload = JSON.parse((await readBody(req)) || '{}');
  const meals = Array.isArray(payload.meals) ? payload.meals.slice(0, 12) : [];
  const preferences = payload.preferences || {};
  const enrichedMeals = await enrichMealsWithRecipeSources(meals, preferences);
  return sendJson(res, { meals: enrichedMeals });
}

// ------------------------------------------------------------ Auditor (LLM) ---

const AUDITOR_SYSTEM_PROMPT = `You are a grocery match auditor for a Danish shopping app.
You receive items. Each item has an "ingredient" name and a list of candidate
supermarket "products" (each with an "id"). For every item, return ALL candidate
ids whose product genuinely IS that ingredient for shopping purposes — so the
shopper can compare price vs distance between the valid stores.
STRICT RULES:
- A product qualifies if it is the actual base ingredient (or a direct raw/whole
  form of it) that a cook would buy for this ingredient.
- REJECT prepared/seasoned/marinated/flavoured products that merely mention the
  ingredient. Examples: "Hvidløgsmarineret flanksteak" is NOT "hvidløg";
  "Tomatketchup" is NOT "tomat"; "Hvidløgsdressing" is NOT "hvidløg";
  "Løgringe (snacks)" is NOT "løg".
- Keep every genuine match, including ones that are NOT on discount.
- If NO candidate qualifies, return an empty array.
Return ONLY JSON: {"results": {"<itemId>": ["<valid id>", ...]}}.
Use exactly the candidate "id" strings provided. No prose.`;

async function handleVerifyMatches(req, res) {
  const payload = JSON.parse((await readBody(req)) || '{}');
  const items = Array.isArray(payload.items) ? payload.items.slice(0, 60) : [];

  // No key (or nothing to audit) → no-op audit; caller keeps its heuristic picks.
  if (!DEEPSEEK_KEY || !items.length) return sendJson(res, { results: {} });

  // Allow-list of valid candidate ids per item — the LLM is NOT trusted to
  // return arbitrary ids (a check on the checker).
  const allowed = new Map(items.map((it) => [String(it.id), new Set((it.candidates || []).map((c) => String(c.id)))]));

  let completion;
  try {
    completion = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({
        model: DEEPSEEK_SMALL_MODEL,
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ items }) },
        ],
      }),
    });
  } catch {
    return sendJson(res, { results: {} }); // graceful: heuristic stands
  }

  if (!completion.ok) return sendJson(res, { results: {} });

  let raw;
  try {
    raw = JSON.parse(JSON.parse(await completion.text()).choices?.[0]?.message?.content || '{}');
  } catch {
    return sendJson(res, { results: {} });
  }

  // Validate + sanitise: per item, keep only candidate ids that were actually
  // offered for it (a check on the checker). Items the model omitted are left
  // out so the client falls back to its heuristic shortlist for those.
  const results = {};
  const src = raw.results && typeof raw.results === 'object' ? raw.results : {};
  for (const [id, validIds] of allowed) {
    if (!(id in src)) continue;
    const value = src[id];
    const arr = Array.isArray(value) ? value : value == null ? [] : [value];
    results[id] = [...new Set(arr.map(String).filter((x) => validIds.has(x)))];
  }

  return sendJson(res, { results });
}

// ------------------------------------------------------------------ Routing ---

async function handleRoute(req, res) {
  const payload = JSON.parse((await readBody(req)) || '{}');
  // coordinates: [[lng, lat], ...] starting at the user, then each stop.
  // The client repeats the first coordinate at the end for a round trip.
  const coordinates = Array.isArray(payload.coordinates) ? payload.coordinates : [];
  const profile = normalizeRouteProfile(payload.profile);

  if (
    coordinates.length < 2 ||
    coordinates.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat))
  ) {
    return sendJson(res, { error: 'need_two_points', detail: 'At least two valid coordinates required.' }, 400);
  }

  let googleError = null;
  if (GOOGLE_MAPS_KEY) {
    try {
      return sendJson(res, await requestGoogleRoute(coordinates, profile));
    } catch (error) {
      googleError = error;
    }
  }

  try {
    return sendJson(res, await requestOpenRoute(coordinates, profile));
  } catch (error) {
    const detail = googleError
      ? `Google Routes: ${googleError.message}; open routing: ${error.message}`
      : error.message;
    return sendJson(res, { error: 'routing_unavailable', detail }, 502);
  }
}

async function requestGoogleRoute(coordinates, profile) {
  const intermediates = coordinates.slice(1, -1).map(googleWaypoint);
  const body = {
    origin: googleWaypoint(coordinates[0]),
    destination: googleWaypoint(coordinates.at(-1)),
    intermediates,
    travelMode: { driving: 'DRIVE', cycling: 'BICYCLE', walking: 'WALK' }[profile],
    optimizeWaypointOrder: intermediates.length > 1,
    polylineQuality: 'OVERVIEW',
    polylineEncoding: 'GEO_JSON_LINESTRING',
    languageCode: 'da-DK',
    units: 'METRIC',
  };
  if (profile === 'driving') body.routingPreference = 'TRAFFIC_UNAWARE';

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
      'X-Goog-FieldMask':
        'routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring,routes.optimizedIntermediateWaypointIndex',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 200)}`);

  const route = JSON.parse(text).routes?.[0];
  if (!route?.polyline?.geoJsonLinestring?.coordinates?.length) throw new Error('no route returned');
  const optimized = route.optimizedIntermediateWaypointIndex?.length
    ? route.optimizedIntermediateWaypointIndex
    : intermediates.map((_, index) => index);

  return {
    provider: 'google',
    profile,
    geometry: route.polyline.geoJsonLinestring,
    distanceMeters: Number(route.distanceMeters) || 0,
    durationSeconds: parseGoogleDuration(route.duration),
    order: [0, ...optimized.map((index) => index + 1), coordinates.length - 1],
  };
}

async function requestOpenRoute(coordinates, profile) {
  const coordString = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  // Each public instance is built for one transport mode. Its OSRM path still
  // uses "driving", but the selected server graph is car, bike, or foot.
  const tripUrl =
    `${OSRM_PROFILE_URLS[profile]}/trip/v1/driving/${coordString}` +
    `?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson`;

  let response;
  try {
    response = await fetch(tripUrl);
  } catch (error) {
    throw new Error(`open route unreachable: ${error.message}`);
  }

  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (data.code !== 'Ok' || !data.trips?.length) throw new Error(data.code || 'no trips');

  const trip = data.trips[0];
  // waypoints[i].waypoint_index gives the optimized visiting order.
  const order = (data.waypoints || [])
    .map((wp, inputIndex) => ({ inputIndex, order: wp.waypoint_index }))
    .sort((a, b) => a.order - b.order)
    .map((w) => w.inputIndex);

  return {
    provider: 'openmaps',
    profile,
    geometry: trip.geometry,
    distanceMeters: trip.distance,
    durationSeconds: trip.duration,
    order,
  };
}

function normalizeRouteProfile(profile) {
  return {
    driving: 'driving',
    car: 'driving',
    cycling: 'cycling',
    bike: 'cycling',
    walking: 'walking',
    foot: 'walking',
  }[profile] || 'driving';
}

function googleWaypoint([lng, lat]) {
  return { location: { latLng: { latitude: lat, longitude: lng } } };
}

function parseGoogleDuration(value) {
  const seconds = Number(String(value || '').replace(/s$/, ''));
  return Number.isFinite(seconds) ? seconds : 0;
}

// ----------------------------------------------------------------- helpers ---

function serveStatic(pathname, res) {
  if (!existsSync(DIST)) {
    return sendJson(res, { error: 'not_built', detail: 'Run npm run build, or use the Vite dev server.' }, 404);
  }
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, safe === '/' ? 'index.html' : safe);
  if (!filePath.startsWith(DIST) || !existsSync(filePath)) {
    filePath = join(DIST, 'index.html'); // SPA fallback
  }
  readFile(filePath)
    .then((buf) => {
      res.writeHead(200, { 'Content-Type': mimeType(filePath) });
      res.end(buf);
    })
    .catch(() => sendJson(res, { error: 'read_failed' }, 500));
}

function mimeType(file) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };
  return map[extname(file)] || 'application/octet-stream';
}

function readBody(req) {
  // In the Cloud Function (Express) the stream is already consumed and exposed
  // as req.rawBody / req.body; locally (node:http) we read the stream directly.
  if (req.rawBody != null) {
    return Promise.resolve(Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody));
  }
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (req.body && typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body));
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseModelJson(content) {
  if (content && typeof content === 'object') return content;

  const cleaned = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const extracted = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : '';
  const attempts = [...new Set([cleaned, extracted].filter(Boolean))];

  for (const value of attempts) {
    try {
      return JSON.parse(value);
    } catch {
      // Models occasionally leave a trailing comma before a closing bracket.
      try {
        return JSON.parse(value.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        /* try the next representation */
      }
    }
  }

  throw new Error('invalid_model_json');
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* ignore malformed .env */
  }
}
