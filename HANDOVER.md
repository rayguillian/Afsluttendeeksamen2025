# KøbSmart — Session Handover

**Date:** 2026-06-06
**Goal:** Working MVP of the KøbSmart app (for a portfolio / course application). NOT the landing page — the app itself. Landing page comes later, once all demo routes work.

## What KøbSmart is
A Danish grocery assistant. Core promise (refined this session): **compare prices across stores and tell the user where each ingredient is cheapest, within their parameters (radius / transport / max stops), then build a shopping route.** It is NOT primarily a discount app — discounts are a bonus label; the real job is cheapest-price comparison + route.

Stack: Vite + React (JS, no TS), Tailwind, Leaflet maps, a zero-dep Node API (`server.mjs`) proxying DeepSeek (recipe generation) + OSRM (routing). State in `localStorage` via `src/lib/store.jsx`. Python scrapers in `kobsmart_scraper/`. Run: `npm run dev` → web on :5173, api on :5174.

---

## DONE THIS SESSION (all built + build-verified; dev server was healthy)

### Flow / architecture (the "wires")
- Added a real **`activePlan`** object to `store.jsx` with a `status` spine: `planning → shopping → cooking → done`. Replaced the duplicate-screen mess.
- **Liste = decide** (`ShoppingListScreen.jsx`): basket grouped by store, "har hjemme" toggles that recalc price live, one button → Start rute. No bought-checklist here.
- **Rute = shop** (`RouteScreen.jsx`): the bought-checklist lives here, reads/writes shared `activePlan.bought` so **ticks survive navigation** (this was a real bug — each screen had its own local Set). All ticked → green savings-reward payoff → cook mode.
- **Wire #3**: Home "Flere forslag" cards route through **Meal Detail** (the cheaper-vs-closer picker), not straight to Liste. Hero "Lav indkøbsplan" stays express.

### Engine (the core value) — all in `src/lib/offers.js`
- **Cheapest-per-ingredient is the default pick** (`bestInStore` = lowest price, not on-sale-first). Verified: chicken→REMA, rice→Netto, tomato→Føtex each cheapest.
- **Store consolidation** (`consolidateStores`): set-cover over nearest ~10 stores, picks the cheapest 1–2 store combo within `maxStops`. Fixed the "5 stores / 7.9 km" scatter → ~1.3 stops / 1.5 km avg.
- **Cross-store savings model**: only 2% of the OLD offer feed had real discount data, so "Spar X" = **price spread vs the priciest shop near you** (`crossSaving` in `deriveRecipe`). Honest, data-backed, labelled "vs dyreste butik nær dig".
- **Three honest item classes — NO "Mangler pris" ever:**
  1. **På tilbud** → matched to feed, real price + saving.
  2. **Basisvare** (cupboard: salt, peber, sukker, mel, olie, vand, eddike) → 0 kr, assumed home. `PANTRY_STAPLES`.
  3. **Standardvare** → not in the feed → clearly-flagged estimate (`STANDARD_PRICES` table + category fallback), attached to the nearest route store, labelled **"~X kr · skøn"** + "Tag med hos {store}". (User pushed hard: estimates must read as estimates, and say *where*.)

### Features
- **Multi-cuisine** select in Måltider (pick several; server prompt updated in `server.mjs`).
- **Ingredient-input mode** ("Indtast varer" toggle in Måltider): type a list → `buildListPlan()` → `matchRecipeOffers` → cheapest stores → plan. No LLM. (`PlanMealScreen.jsx`)
- **Per-trip Rutepræferencer**: editable `TripParams` panel in Måltider (Billigst/Balance/Kortest, radius, max stops, transport) — writes to `routePreferences`, defaults from profile. Answers "where are params set?".
- **Recipe steps in Meal Detail** (`CookSteps` in `RecipeDetail.jsx`) — see effort before committing. Hidden for `cuisine === 'liste'` plans.
- **First-run instant value**: `src/lib/starterMeals.js` — 6 built-in meals priced against today's offers on Home mount (`HomeScreen.jsx` seeding effect). Verified all 6 price (48–88 kr, real savings). Also serves as DeepSeek-offline fallback.

### Visual identity (bold & appetizing)
- `index.css` component layer rewritten: **loud solid-orange `.savings-pill`**, restored letter-spacing (a `letter-spacing:0` override was the "oatmeal" culprit), rounded-2xl, real depth, `.hero-card` (deep-green block), `.btn-cream`. `tailwind.config.js` shadows deepened (`card/float/hero`).
- **Green hero** on Home (DailyDealCard) + **savings-reward** on Rute + **prominent Wolt-style map** (taller, "Dig · N butikker nær dig" pulsing chip).
- Consistency pass: `ui.jsx` primitives (chips fill green when active, rounded-2xl banners/empty-states), SetupWizard (green progress + serif titles), ProfileScreen (green avatar), Måltider tiles, AuthScreen (deep-green hero).

### Data integrity (verified, real)
- Source of OLD feed: **eTilbudsavis/Tjek API** (offers only). 16,268 offers / 88 stores, Aarhus, fresh.
- Coordinates 100% valid + in Aarhus, store↔offer correspondence clean (0 orphans/conflicts).
- **Non-food contamination filter** in `loadOffers()` (`isLikelyGrocery`): removed 87 junk offers (MacBook/TV/microwave) — hypermarkets leak electronics because the scrape filters by *chain* not *product*. 0 food lost.
- **Demo location pinned to Aarhus** (`DEMO_FORCE_LOCATION` in `constants.js`, honored in `useGeolocation.js`) — user is abroad; flip to `false` for live GPS.

### LLM verification (already existed)
- DeepSeek "Auditor" (`/api/recipes/verify-matches`) vets ingredient↔product matches (rejects "salt"→"saltede peanuts"). Precision only; can't fix recall or missing data. Note: the headless audit runs the heuristic path (no Auditor).

### Dev harnesses left in repo root
- `audit.mjs` — headless user-journey audit (run: `node_modules/.bin/esbuild audit.mjs --bundle --platform=node --format=esm --outfile=/tmp/a.mjs && node /tmp/a.mjs`). Tip: `--define:import.meta.env='{"BASE_URL":"/"}'` if a module touches it.
- `integrity.mjs` — data-integrity audit (`node integrity.mjs`).
- (Consider moving these to a `scripts/` folder for portfolio tidiness.)

---

## DONE (2026-06-06) — real shelf prices via chain-level pricing (REMA 1000)

**Shipped.** The app now pulls **real REMA 1000 shelf prices** (not just flyer discounts), so EVERY item can be price-compared, not only on-offer ones. Both prior sources (eTilbudsavis, Salling food-waste) are discount-only — that's why staples like "rasp" had no price. REMA shelf prices now fill that gap and compete head-to-head with flyer offers.

**What was built:**
- `rema1000.py`: `fetch_catalog()` (national shelf prices) + **`fetch_stores()`** (434 stores w/ `location.lat/lng` — the handover's "stores endpoint has no lat/lng" was WRONG; it does).
- `build_catalog.py` + npm `build:catalog` → writes **`public/data/catalog.json`** = `{products[], stores[]}` (3004 products + 434 stores, ~1MB). Decoupled from the weekly flyer `offers.json` (different cadence).
- `offers.js`: `loadOffers()` now also loads catalog + builds `storesByChain`; new exported **`resolveOffers(loaded, userPos)`** appends each chain-level price as a synthetic offer placed at the shopper's **nearest store of that chain** (REMA pricing is national). Existing per-store `rankCandidates`/consolidation/cross-store-savings work unchanged.
- Wired `resolveOffers` into PlanMealScreen (recipe + list modes) and starterMeals.
- `normalize.py` `ingredient_keywords`: now drops pack-size numbers (`250`,`805`) + house-brand noise (`bavinchi`,`loesvaegt`).

**Verified:** `npm run build` green; matcher test → 16181 flyer + 3004 shelf = 19185 resolved offers; shelf prices compete with flyers (mozzarella shelf 6.95 < tilbud 10; hvidløg now a REAL 5.5kr instead of a hardcoded estimate).

**Known new-ish limitation:** the recipe→product matcher's compound-suffix logic can false-match on a noun (e.g. "hakket oksekød" → "Cupnudler Oksekød"); 3k more products surfaces more of these. Next candidate: tighten `termStrength`/disqualifiers in `offers.js`.

**To add more chains later** (same pattern): each emits the `catalog.json` product/store shape; `resolveOffers` already merges any chain present in `storesByChain`. Candidates: Coop (`coop.dk/mad` internal API), Bilka ToGo / Salling (needs `SALLING_GROUP_TOKEN`), nemlig.com (online-only). Lidl/Aldi stay flyer-only.

<details><summary>Original recon notes (kept for reference)</summary>

### Recon done (validated live)
- **REMA 1000 `https://api.digital.rema1000.dk/api/v3` is FULLY OPEN and returns the full catalogue with regular shelf prices.** This is the breakthrough.
  - `/departments` → 15 categories (10 Brød, 20 Frugt&grønt, 30 Kød/fisk, 40 Køl, 50 Frost, 60 Mejeri, 70 Ost, 80 Kolonial, 90 Drikkevarer, 130 Slik, 140 Kiosk, 160 Nemt; skip 100/110/120 non-food).
  - `/departments/{id}/products?per_page=100&page=N` → products with `prices[].price`, `compare_unit_price` (kr/kg), `is_campaign`, `underline` (qty/brand). Dept 30 alone = 124 pages at per_page=1, so a few thousand products total. **National uniform pricing** (one price per product, all stores).
  - **Stores endpoint has NO lat/lng** → reuse REMA store coords already present in `public/data/offers.json` (25 REMA stores), or geocode by postal code.
- **nemlig.com** webapi returned empty with my probe — needs different path/headers (try `https://www.nemlig.com/webapi/Search/Search?query=...` with cookies/session). nemlig is its own pricing (online-only).
- **Salling Group** (Netto/Føtex/Bilka) `/v2/stores` → **HTTP 401**, needs a free `SALLING_GROUP_TOKEN`. The existing `salling.py` only does food-waste (discounts), NOT full catalogue — Bilka ToGo (`bilkatogo.dk`) has full prices via its own internal API (separate build).
- **Coop** (Kvickly/SuperBrugsen/Coop365): `coop.dk/mad` online shop has an internal API — not yet probed.

### Built (NOT yet run end-to-end — run was interrupted by handover)
- **`kobsmart_scraper/rema1000.py`** — a real, polite REMA client + `fetch_catalog(max_pages=None)` that pulls all food departments, picks the active price, normalizes name + derives `ingredient_keywords` (reuses `normalize.py` helpers), returns records shaped close to the app's offer schema (chain, product_name, normalized_product_name, ingredient_keywords, price_dkk, is_campaign, compare_unit_price, department).

### EXACT NEXT STEPS (resume here)
1. **Run the scraper** to confirm it pulls real data:
   ```bash
   cd <repo>; python3 -c "from kobsmart_scraper.rema1000 import fetch_catalog; r=fetch_catalog(max_pages=1); print(len(r)); [print(x['price_dkk'],x['product_name'],x['ingredient_keywords']) for x in r[:10]]"
   ```
   Then a full pull (`max_pages=None`), save to `data/rema1000_catalog.json`.
2. **Architecture decision — chain-level pricing.** REMA price is national, so DON'T explode full catalogue × all stores (millions of rows / huge JSON). Instead:
   - Store catalogue as **one record per product per chain** (chain-level price).
   - Keep a separate **chain→stores** location list (reuse coords from existing `offers.json`, or fetch per chain).
   - **App matcher change** (`offers.js` `rankCandidates`): match ingredient → cheapest *chain* catalogue entries → for routing, attach the **nearest store of that chain** to the user. This is the one real app-side refactor required. Distance is then "nearest REMA" not "this specific REMA's offer".
   - This makes "where's cheapest" true for EVERY item (chicken cheaper at REMA vs Netto vs Føtex, etc.), and keeps data small (~thousands of rows/chain, not millions).
3. **Add chains one at a time**, same pattern: REMA (done-ish) → Coop (coop.dk api) → Bilka ToGo / Salling (needs token) → Lidl/Aldi (flyer-only, may stay offer-only). Each emits the same normalized record shape; `build_app_data.py` merges all into the app data file.
4. **Keep the offer feed too** — merge offers (eTilbudsavis) over shelf prices so a discounted price wins when present. Best of both.

### ToS / legal caveat (tell the user, important for portfolio + any real use)
Scraping chain catalogues is a recognized price-comparison use case but lives in a **legal grey area**: site ToS often prohibit scraping, and the **EU/DK sui-generis database right** can apply. REMA's API is public/unauthenticated and widely used in hobby projects, but for anything beyond a personal portfolio demo, get permission or use official feeds. Be polite (rate-limit, UA, cache daily). Frame the portfolio piece as an educational MVP.

</details>

> ⚠️ **ToS / legal caveat still applies** (see the recon notes above): REMA's API is public but scraping lives in an EU database-right grey area — keep this framed as an educational MVP, stay polite (rate-limit, UA, daily cache).

---

## KNOWN LIMITATIONS / TODO
- `maxStops` is a soft target, not a hard cap (an ingredient whose only match is far can add a 3rd stop). Harden `consolidateStores` if needed.
- Heuristic matcher (list-mode, starter meals) has recall gaps without the Auditor; degrades gracefully to estimates. Could run Auditor on list-mode or widen produce/dairy aliases in `TERM_ALIASES`.
- No browser automation installed → no automated click-through. Build + headless audits + manual seam review only. Offer to add Playwright for real screenshots.
- `audit.mjs`/`integrity.mjs` in repo root — tidy into `scripts/`.

## KEY FILES
- State/flow: `src/lib/store.jsx`, `src/App.jsx`
- Engine: `src/lib/offers.js` (matching, consolidation, savings, 3 classes), `src/lib/planner.js` (Chef→Pantry→Auditor→Cashier)
- Screens: `src/components/screens/{HomeScreen,PlanMealScreen,ShoppingListScreen,RouteScreen,ProfileScreen}.jsx`, `src/components/RecipeDetail.jsx`, `src/components/auth/{AuthScreen,SetupWizard}.jsx`
- Design: `src/index.css`, `tailwind.config.js`, `src/components/ui.jsx`
- First-run: `src/lib/starterMeals.js`
- Scrapers: `kobsmart_scraper/{rema1000.py (NEW), etilbudsavis.py, salling.py, normalize.py, build_app_data.py, cli.py}`
- Data: `public/data/offers.json` (served), `data/`
- Constants/flags: `src/lib/constants.js` (`DEMO_FORCE_LOCATION`, `DEFAULT_ROUTE_PREFERENCES` maxStops=2)
- Architecture/IA notes: `NEW IA.md`
