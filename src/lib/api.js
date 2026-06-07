// Thin client over the local API server (server.mjs). All network secrets live
// server-side; the browser only ever talks to /api/*.

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    const err = new Error('network_unreachable');
    err.detail = 'Kunne ikke nå den lokale API-server. Kører `npm run dev`?';
    throw err;
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* leave data empty */
  }

  if (!res.ok) {
    const err = new Error(data.error || `http_${res.status}`);
    err.status = res.status;
    err.detail =
      data.detail ||
      (res.status === 404
        ? 'API-ruten findes ikke. Start appen med `npm run dev`, så både web- og API-serveren kører.'
        : '');
    throw err;
  }
  return data;
}

/** @returns {Promise<{ok:boolean, deepseek:boolean, osrm:boolean, googleRoutes:boolean, routingProvider:string}>} */
export async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { ok: false, deepseek: false, osrm: false };
    return await res.json();
  } catch {
    return { ok: false, deepseek: false, osrm: false };
  }
}

/**
 * Ask DeepSeek (via proxy) for recipes.
 * @returns {Promise<{meals: Array}>}
 */
export function generateRecipes({ preferences, nearbyOffers }) {
  return postJson('/api/recipes/deepseek', { preferences, nearbyOffers });
}

/**
 * AUDITOR: ask the cheap model which shortlisted offers genuinely ARE each
 * ingredient (rejecting e.g. "hvidløgsmarineret flanksteak" for "hvidløg").
 * Returns the full whitelist per item so the shopper can compare store options.
 * @param items [{ id, ingredient, candidates:[{id,product,chain,price}] }]
 * @returns {Promise<{results: Record<string, string[]>}>}  id → valid offer ids
 */
export function verifyMatches({ items }) {
  return postJson('/api/recipes/verify-matches', { items });
}

/**
 * Attach cached real recipe source URLs to generated or saved meals.
 * @returns {Promise<{meals: Array}>}
 */
export function enrichRecipeSources({ meals, preferences }) {
  return postJson('/api/recipes/sources', { meals, preferences });
}

/**
 * Optimise + draw a route through stops using Google Routes when configured,
 * otherwise a transport-aware open routing provider.
 * @param coordinates [[lng,lat], ...] starting with the user's position. Repeat the first coordinate at the end for a round trip.
 * @returns {Promise<{geometry, distanceMeters, durationSeconds, order:number[]}>}
 */
export function planRoute({ coordinates, profile }) {
  return postJson('/api/route/openmaps', { coordinates, profile });
}
