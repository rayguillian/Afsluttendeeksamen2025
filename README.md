# KøbSmart — Demo MVP

A local demo of a smart Danish grocery assistant: mock auth → one-time setup →
plan a meal per cuisine → AI recipes from **DeepSeek** matched against **real
scraped offers** → a transport-aware route with **live GPS** and Google Maps
turn-by-turn navigation.

> Demo only. No real accounts, no database, no payments. Everything persists in
> `localStorage` under the `kobsmart:v1` namespace.

## Architecture

```
Browser (Vite + React)            Local API server (server.mjs, zero deps)
─────────────────────             ────────────────────────────────────────
  localStorage  kobsmart:v1   ┌──▶ POST /api/recipes/deepseek  → DeepSeek
  Leaflet + OSM tiles         │    POST /api/route/openmaps     → Google Routes*
  Google Maps navigation URL  │                                → open routing fallback
  navigator.geolocation       │    GET  /api/health
        │  fetch /api/* ──────┘    (DEEPSEEK_API_KEY stays server-side)
        └─ fetch nearest /data/regions/*.json (served statically)
```

Vite proxies every `/api/*` call to the local API server, so the DeepSeek key is
never exposed to the browser.

`*` Google Routes is used when a server-side `GOOGLE_MAPS_API_KEY` is configured.
Without it, the API uses separate car, cycling, and walking route graphs. The
route screen can always open the optimized stops in Google Maps without a key.

## Run

```bash
npm install
cp .env.example .env        # add your DEEPSEEK_API_KEY
npm run dev                 # starts Vite (web) + API server together
```

Open the printed Vite URL (http://localhost:5173). You can also run the two
processes separately with `npm run dev:web` and `npm run dev:api`.

### Without a DeepSeek key

The app still runs. The Plan-a-meal screen shows a clear **“recipe generation
unavailable”** state instead of faking recipes. Maps, GPS and routing work
regardless.

## Build

```bash
npm run build               # outputs dist/
npm start                   # serve dist/ + API from server.mjs (PORT via API_PORT)
```

## How a meal plan works

1. **Setup (once):** dietary preferences, allergies, preferred stores, radius,
   transport, max stops, and route priority. Dietary prefs are edited only from
   **Profile** afterwards.
2. **Plan Meal:** the user picks a **cuisine per session** (not a stored
   preference). The recipe + offer matching runs through a staged
   "checks-and-balances" pipeline (see below).
3. **Save / Route:** recipes can be saved (name, cuisine, ingredients, matched
   offers, stores, total, timestamp). The route screen draws a transport-aware
   polyline with a per-store shopping checklist and a Google Maps navigation link.

### The meal-planning pipeline (`src/lib/planner.js`)

A small multi-stage flow — creative model proposes, deterministic code + a cheap
audit model verify. Each stage owns exactly one job; prices and stores never come
from the creative model, only from real vetted offers. Every LLM step degrades
gracefully.

| Stage | Where | What |
|-------|-------|------|
| **Chef** | DeepSeek (large model) | Generates recipes for the cuisine, honouring diet + allergies, grounded in nearby offers |
| **Source cache** | `recipe_sources.mjs` | Finds real Danish recipe URLs, scrapes lightweight metadata, infers difficulty, and caches source results |
| **Pantry** | `offers.js` (deterministic) | Word-boundary matches each ingredient to the scraped offers, ranked by preferred shop / radius / price / **live** distance; shortlists the top 4 |
| **Auditor** | DeepSeek (small model) | Confirms which shortlisted product genuinely *is* the ingredient, or rejects all — kills "hvidløgsmarineret flanksteak" for "hvidløg", "tomatketchup" for "tomat" |
| **Cashier** | `offers.js` (deterministic) | Rolls up the vetted picks into per-store baskets, totals and savings |

Without a DeepSeek key the Chef shows the unavailable state. If only the Auditor
is unreachable, the deterministic Pantry pick stands. Distance is recomputed from
the user's **live** GPS, not the static captured value.

### Recipe sources

After DeepSeek returns meals, the API enriches each meal through
`recipe_sources.mjs`. It searches for real recipe pages from known Danish recipe
domains, scrapes JSON-LD/title metadata where available, and stores the result
in `data/recipe_sources_cache.json` for 30 days. If source lookup is disabled or
no real URL is found, the UI falls back to the generated KøbSmart source label.

Useful environment knobs:

```bash
RECIPE_SOURCE_LOOKUP=false      # disable web lookup
RECIPE_SOURCE_CACHE_HOURS=720   # default 30 days
RECIPE_SOURCE_TIMEOUT_MS=7000
```

### Map & GPS behaviour

- Live GPS via `navigator.geolocation.watchPosition`; user marker updates live.
- GPS denied → falls back to **Aarhus C** and clearly labels the location as
  estimated.
- The nearest scraped Danish region is selected from GPS; offer distances are
  always recomputed from the live device position.
- Walking, cycling, and driving use separate route graphs. Google Routes is
  preferred when configured.
- Routing unavailable → keeps store markers and draws a direct-line fallback.

## Offer data (scraper)

Real offers are served from the nearest file in `public/data/regions/`, with
`public/data/offers.json` retained as the Aarhus-compatible fallback.

```bash
python3 -m pip install -r requirements.txt
npm run scrape:offers       # capture fresh Aarhus offers
npm run build:offers        # rebuild public/data/offers.json
npm run refresh:offers      # scrape + rebuild in one daily job
npm run build:regions       # scrape/build several Danish city regions
```

The app reads `meta.source`, `meta.scraped_at`, `meta.offer_count` and
`meta.store_count` from `public/data/offers.json` and shows that freshness on the
planning screen. The repo includes `.github/workflows/refresh-offers.yml`, which
runs once daily and commits refreshed `data/etilbudsavis_grocery_offers.xlsx` and
`public/data/offers.json` when the source data changes. For local/manual refresh:

```bash
npm run refresh:offers
```

## Public state (`kobsmart:v1`)

`user`, `dietaryPreferences`, `allergies`, `routePreferences`, `preferredStores`,
`savedRecipes`, `lastPlan`.

## Server endpoints

`GET /api/health` · `POST /api/recipes/deepseek` (Chef + source cache) ·
`POST /api/recipes/sources` (source cache only) ·
`POST /api/recipes/verify-matches` (Auditor, cheap model) ·
`POST /api/route/openmaps` (Google Routes when configured; transport-aware open fallback)

## Notes

The eTilbudsavis/Tjek endpoint is useful for local validation. Clarify
API/integration permission before relying on it for a public or commercial
deployment.
