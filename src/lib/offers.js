import { haversineKm, normalizeText, roundMoney } from './geo.js';

// ---------------------------------------------------------------------------
// Offer data: scraped etilbudsavis grocery offers (public/data/offers.json).
// Loaded once, then distance is always recomputed against the user's *live*
// location rather than the static distance_km captured at scrape time.
// ---------------------------------------------------------------------------

// Region-aware offer cache. Keyed by resolved region id (or '__default__' when
// there is no regions index yet). Lets the daily scrape ship one file per Danish
// city while the app loads only the region nearest the user.
const regionCache = new Map();
let regionsIndexPromise = null;

// Grocery sanity guard. The scraper filters by CHAIN, so hypermarkets (Bilka,
// Føtex, Netto) leak electronics/appliances/clothing into the feed. No real
// weeknight grocery costs >300 kr (p99 of the data is 219 kr), and these terms
// are unmistakably non-food. Belt-and-braces with the build-stage filter.
const GROCERY_PRICE_CEILING = 300;
const NON_GROCERY = /\b(macbook|imac|ipad|iphone|samsung|galaxy|airpods|playstation|xbox|nintendo|tv|fjernsyn|laptop|computer|skærm|monitor|printer|mikrobølge|mikroovn|kaffemaskine|støvsuger|cykel|commuter|løbehjul|jakke|bukser|sneakers|parfume|smykke|legetøj|værktøj|batteri|powerbank)\b/i;

function isLikelyGrocery(o) {
  if (Number(o.price_dkk) > GROCERY_PRICE_CEILING) return false;
  return !NON_GROCERY.test(`${o.product_name} ${o.normalized_product_name}`);
}

// Shape a raw record (flyer offer OR chain-level catalogue product) into the
// internal offer used by the matcher. Chain-level products carry no store — that
// is attached at match time by resolveOffers() (nearest store of their chain).
function shapeOffer(o, index, { chainLevel = false } = {}) {
  const offer = {
    id: chainLevel ? `cat-${o.product_id ?? index}` : o.source_offer_id || `offer-${index}`,
    productName: o.product_name,
    chain: o.chain,
    storeId: o.store_id,
    storeName: o.store_name,
    street: o.street,
    zip: o.zip,
    city: o.city,
    lat: Number(o.latitude),
    lng: Number(o.longitude),
    price: Number(o.price_dkk),
    originalPrice: Number(o.original_price_dkk) || null,
    discountPercent: Number(o.discount_percent) || null,
    quantity: o.quantity_text || o.compare_unit || '',
    validTo: o.valid_to || null,
    imageUrl: o.image_url || null,
    keywords: o.ingredient_keywords || '',
    // Chain-level shelf price (regular, national) vs a time-limited flyer offer.
    chainLevel,
    isShelfPrice: chainLevel,
    // Word-tokenised search text: matching is word/prefix aware so we don't
    // match "ost" (cheese) inside "postej" or "pasta" in "plaster".
    words: normalizeText(
      `${o.product_name} ${o.normalized_product_name} ${o.ingredient_keywords}`,
    ).split(' ').filter(Boolean),
  };
  offer.searchText = offer.words.join(' ');
  return offer;
}

const chainKey = (chain) => normalizeText(chain);

// chain → [{storeId, storeName, lat, lng, ...}] for every store we have coords
// for. Used to route a chain-level price to the shopper's nearest store.
function buildStoresByChain(...storeLists) {
  const map = new Map();
  for (const list of storeLists) {
    for (const s of list || []) {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = chainKey(s.chain);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        storeId: s.store_id,
        storeName: s.store_name,
        street: s.street || '',
        zip: s.zip || '',
        city: s.city || '',
        lat,
        lng,
      });
    }
  }
  return map;
}

async function fetchJson(path) {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Kunne ikke indlæse data (${res.status})`);
  return res.json();
}

// Regions index (optional). Shape: { default: 'aarhus', regions: [{ id, name, lat, lng }] }.
// Absent → the app falls back to the single legacy data/offers.json (Aarhus).
function loadRegionsIndex() {
  if (!regionsIndexPromise) {
    regionsIndexPromise = fetchJson('data/regions/index.json').catch(() => null);
  }
  return regionsIndexPromise;
}

// Nearest region to the user, or the index default. null → no regions yet.
async function resolveRegionId(userPos) {
  const index = await loadRegionsIndex();
  if (!index || !Array.isArray(index.regions) || !index.regions.length) return null;
  const fallback = index.default || index.regions[0].id;
  if (!userPos || !Number.isFinite(userPos.lat) || !Number.isFinite(userPos.lng)) return fallback;
  let best = fallback;
  let bestDist = Infinity;
  for (const r of index.regions) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const d = haversineKm(userPos, { lat: r.lat, lng: r.lng });
    if (d < bestDist) {
      bestDist = d;
      best = r.id;
    }
  }
  return best;
}

/**
 * Load the offer set for the user's region (nearest of the scraped cities),
 * falling back to the single Aarhus file when no regions index exists yet.
 * @param userPos optional {lat,lng} — picks the nearest region.
 */
export function loadOffers(userPos) {
  const keyPromise = resolveRegionId(userPos).then((regionId) => regionId || '__default__');
  return keyPromise.then((cacheKey) => {
    if (!regionCache.has(cacheKey)) {
      const promise = (async () => {
        const offersPath =
          cacheKey === '__default__' ? 'data/offers.json' : `data/regions/${cacheKey}.json`;
        let offerPayload;
        try {
          offerPayload = await fetchJson(offersPath);
        } catch {
          offerPayload = await fetchJson('data/offers.json'); // resilient fallback
        }
        // Catalogue is shared nationally (chain shelf prices) and optional.
        const catalogPayload = await fetchJson('data/catalog.json').catch(() => ({}));

        const offers = (offerPayload.offers || [])
          .filter((o) => Number.isFinite(Number(o.price_dkk)) && Number(o.price_dkk) > 0)
          .filter(isLikelyGrocery)
          .map((o, index) => shapeOffer(o, index));

        const catalog = (catalogPayload.products || [])
          .filter((o) => Number.isFinite(Number(o.price_dkk)) && Number(o.price_dkk) > 0)
          .filter(isLikelyGrocery)
          .map((o, index) => shapeOffer(o, index, { chainLevel: true }));

        const storesByChain = buildStoresByChain(offerPayload.stores, catalogPayload.stores);

        return { meta: offerPayload.meta || {}, catalogMeta: catalogPayload.meta || {}, offers, catalog, storesByChain };
      })().catch((err) => {
        regionCache.delete(cacheKey); // allow retry
        throw err;
      });
      regionCache.set(cacheKey, promise);
    }
    return regionCache.get(cacheKey);
  });
}

// The store of each chain nearest the shopper (one per chain). Recomputed per
// position so it tracks the user's live location, like flyer distances do.
function nearestStorePerChain(storesByChain, userPos) {
  const out = new Map();
  if (!userPos || !Number.isFinite(userPos.lat) || !Number.isFinite(userPos.lng)) return out;
  for (const [key, stores] of storesByChain) {
    let best = null;
    let bestDist = Infinity;
    for (const s of stores) {
      const d = haversineKm(userPos, { lat: s.lat, lng: s.lng });
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    if (best) out.set(key, best);
  }
  return out;
}

/**
 * Merge chain-level shelf prices into the flyer offers as a flat, matchable
 * offer list. Each catalogue product becomes one synthetic offer placed at the
 * shopper's NEAREST store of that chain (REMA pricing is national) — so the
 * existing per-store ranking/consolidation works unchanged and a real shelf
 * price competes head-to-head with this week's flyers. Call once per position.
 */
export function resolveOffers(loaded, userPos) {
  const flyer = loaded.offers || [];
  const catalog = loaded.catalog || [];
  if (!catalog.length) return flyer;

  const nearest = nearestStorePerChain(loaded.storesByChain, userPos);
  if (!nearest.size) return flyer; // no location → can't route shelf prices

  const resolved = [];
  for (const product of catalog) {
    const store = nearest.get(chainKey(product.chain));
    if (!store) continue; // no known store of this chain to route to
    resolved.push({
      ...product,
      storeId: store.storeId,
      storeName: store.storeName,
      street: store.street,
      zip: store.zip,
      city: store.city,
      lat: store.lat,
      lng: store.lng,
    });
  }
  return [...flyer, ...resolved];
}

const withDistance = (offer, userPos) => ({
  ...offer,
  distanceKm: haversineKm(userPos, { lat: offer.lat, lng: offer.lng }),
});

const STOP_WORDS = new Set([
  'frisk', 'friske', 'klassisk', 'oekologisk', 'oekologiske', 'hakket',
  'uden', 'med', 'til', 'og', 'eller', 'evt', 'efter', 'smag', 'ca',
]);

// DeepSeek sometimes names common ingredients in English or too generically
// ("pasta"), while the Danish offer data usually exposes concrete product terms
// ("spaghetti"). Expand only conservative food aliases that are useful for
// matching current Danish grocery flyers.
const TERM_ALIASES = {
  pasta: ['spaghetti', 'penne', 'fusilli', 'makaroni'],
  spaghetti: ['pasta'],
  noodle: ['nudler', 'risnudler'],
  noodles: ['nudler', 'risnudler'],
  garlic: ['hvidloeg'],
  hvidloeg: ['hvidloeg'],
  onion: ['loeg'],
  onions: ['loeg'],
  olive: ['olivenolie'],
  oil: ['olie', 'olivenolie', 'jomfruolivenolie', 'rapsolie'],
  oliveolie: ['olivenolie', 'jomfruolivenolie'],
  olivenolie: ['jomfruolivenolie', 'olie'],
  tomato: ['tomat', 'tomater', 'blommetomater', 'hakkede tomater'],
  tomatoes: ['tomat', 'tomater', 'blommetomater', 'hakkede tomater'],
  tomat: ['tomater', 'blommetomater'],
  tomater: ['tomat', 'blommetomater'],
  basil: ['basilikum'],
  mozzarella: ['mozzarella'],
  bread: ['broed', 'rugbroed', 'boller'],
  broed: ['rugbroed', 'boller'],
  cream: ['floede', 'madlavningsfloede'],
  flode: ['floede', 'madlavningsfloede'],
  floede: ['madlavningsfloede'],
};

const NON_FOOD_WORDS = new Set([
  'tandpasta',
  'vaskemiddel',
  'eltandboerste',
  'deodorant',
  'shampoo',
  'opvaskemiddel',
  'opvasketabs',
  'rengoering',
  'rengoring',
  'toiletpapir',
  'koekkenrulle',
  'kattemad',
  'hundemad',
  'macbook',
]);

function ingredientTerms(ingredient) {
  const fromKeywords = (ingredient.keywords || [])
    .map(normalizeText)
    .filter(Boolean);
  const fromName = normalizeText(ingredient.name)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  const base = [...new Set([...fromKeywords, normalizeText(ingredient.name), ...fromName].filter(Boolean))];
  const aliases = base.flatMap((term) => TERM_ALIASES[term] || []);
  return [...new Set([...base, ...aliases].map(normalizeText).filter(Boolean))];
}

export function parseListText(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayChain(chain) {
  return normalizeText(chain) === 'foetex' ? 'Føtex' : chain;
}

function displayStoreName(storeName) {
  return String(storeName || '').replace(/^føtex\b/i, 'Føtex').trim();
}

function isPantryIngredient(ingredient, pantryItems = []) {
  const pantry = pantryItems.map(normalizeText).filter(Boolean);
  if (!pantry.length) return false;
  const terms = ingredientTerms(ingredient).filter((term) => term.length >= 3);
  // Pantry removal must be conservative: having "ris" does not mean the user
  // has "risnudler". Known aliases are already included in ingredientTerms().
  return pantry.some((item) => terms.some((term) => item === term));
}

// Distance weight (DKK penalty per km) by route priority.
const DISTANCE_WEIGHT = { price: 0.15, balanced: 0.6, distance: 2.2 };
// DKK bonus by match strength — whole-word hits strongly beat compound ones, so
// a real "hvidløg" offer wins over "hvidløgsmarineret flanksteak".
const STRENGTH_BONUS = { 3: 14, 2: 5, 1: 3 };
const COMPOUND_SLACK = 7; // max extra chars a compound word may carry

/**
 * How well a single term matches an offer's words. Matching is word-boundary
 * aware (prefix or suffix only, never an arbitrary mid-word substring) so we
 * keep Danish compounds — "kylling"→"kyllingebryst", "kartofler"→
 * "bagekartofler" — while rejecting "ost"→"postej" and "hvidloeg"→
 * "hvidloegsmarineret flanksteak".
 *   3 = exact whole word · 2 = compound prefix · 1 = compound suffix · 0 = none
 */
function termStrength(term, offer) {
  if (term.length < 3) return 0;
  if (termDisqualifiedOffer(term, offer)) return 0;
  if (offer.words.includes(term)) return 3;
  if (EXACT_ONLY_TERMS.has(term)) return 0;
  if (term.length < 4) return 0;
  let best = 0;
  for (const w of offer.words) {
    if (w.length - term.length > COMPOUND_SLACK) continue;
    if (w.startsWith(term)) return 2; // prefix is the strongest compound match
    if (w.endsWith(term)) best = 1;
  }
  return best;
}

function disqualifiedOffer(offer) {
  return offer.words.some((word) => NON_FOOD_WORDS.has(word));
}

const EXACT_ONLY_TERMS = new Set(['pasta']);

const PASTA_NOT_BASE_WORDS = new Set(['pastasauce', 'pesto']);
const OIL_NOT_BASE_WORDS = new Set(['tun', 'makrel', 'makrelfileter', 'sild', 'fiskekonserves']);
const TOMATO_NOT_BASE_WORDS = new Set(['ketchup', 'makrel', 'makrelfileter', 'fiskekonserves']);

function termDisqualifiedOffer(term, offer) {
  if (term === 'pasta') return offer.words.some((word) => PASTA_NOT_BASE_WORDS.has(word));
  if (term === 'olie' || term === 'olivenolie') return offer.words.some((word) => OIL_NOT_BASE_WORDS.has(word));
  if (term === 'tomat' || term === 'tomater') return offer.words.some((word) => TOMATO_NOT_BASE_WORDS.has(word));
  return false;
}

/**
 * PANTRY stage (deterministic). Rank the best candidate offers for one DeepSeek
 * ingredient given live location + route/store prefs. Returns up to `k`
 * candidates, best-first. This shortlist is what the Auditor (LLM) then vets —
 * it never sees the full 14k offers, keeping that check cheap.
 */
export function rankCandidates(ingredient, offers, userPos, prefs = {}, k = 4) {
  const terms = ingredientTerms(ingredient);
  if (!terms.length) return [];

  const radiusKm = Number(prefs.radiusKm) || 1000;
  const preferred = new Set((prefs.preferredStores || []).map((s) => s.toLowerCase()));
  const distanceWeight = DISTANCE_WEIGHT[prefs.priority] ?? DISTANCE_WEIGHT.balanced;

  const scored = [];
  for (const offer of offers) {
    if (disqualifiedOffer(offer)) continue;
    // A non-empty store selection is a hard boundary, not a mild preference:
    // never route the shopper through a chain they explicitly left unchecked.
    if (preferred.size && !preferred.has((offer.chain || '').toLowerCase())) continue;
    let strength = 0;
    for (const term of terms) {
      const s = termStrength(term, offer);
      if (s > strength) strength = s;
      if (strength === 3) break;
    }
    if (strength === 0) continue;

    const distanceKm = haversineKm(userPos, { lat: offer.lat, lng: offer.lng });
    if (distanceKm > radiusKm) continue;
    const radiusPenalty = 0;
    const score =
      offer.price + distanceKm * distanceWeight + radiusPenalty - STRENGTH_BONUS[strength];

    scored.push({ ...offer, distanceKm, strength, score });
  }

  // One option per CHAIN at its best (nearest) store. Danish chain flyer/shelf
  // pricing is national — the same cucumber is the same price at every REMA 1000
  // — so two branches of one chain are never worth two stops. Collapsing per
  // chain (not per store) makes the candidate list a true cross-chain comparison
  // — cheapest-at-Lidl vs closest-at-REMA — and guarantees every item assigned to
  // a chain routes to that chain's single nearest branch. Mirrors the catalogue
  // path's nearestStorePerChain().
  const byChain = new Map();
  for (const cand of scored) {
    const key = chainKey(cand.chain) || cand.storeId || `${cand.storeName}-${cand.lat}-${cand.lng}`;
    const existing = byChain.get(key);
    // Lower score = better (price + distance − match strength); within a chain
    // price is uniform, so this resolves to the nearest branch.
    if (!existing || cand.score < existing.score) byChain.set(key, cand);
  }

  const storeOptions = [...byChain.values()];
  const bestByScore = [...storeOptions].sort((a, b) => a.score - b.score).slice(0, Math.max(1, k - 2));
  const cheapestOption = [...storeOptions].sort((a, b) => a.price - b.price || a.distanceKm - b.distanceKm)[0];
  const nearestOption = [...storeOptions].sort((a, b) => a.distanceKm - b.distanceKm || a.price - b.price)[0];

  // Always include the comparison anchors the shopper cares about:
  // best balanced match, cheapest real product, and closest real product.
  const chosen = new Map();
  for (const cand of [...bestByScore, cheapestOption, nearestOption].filter(Boolean)) {
    chosen.set(cand.id, cand);
  }

  return [...chosen.values()].sort((a, b) => a.score - b.score);
}

/** Backwards-compatible single best match (no audit). */
export function matchIngredient(ingredient, offers, userPos, prefs = {}) {
  return rankCandidates(ingredient, offers, userPos, prefs, 1)[0] || null;
}

/** Shape a ranked candidate offer into a selectable store option. */
function offerToOption(offer) {
  const original = offer.originalPrice && offer.originalPrice > offer.price ? offer.originalPrice : null;
  return {
    offerId: offer.id,
    productName: offer.productName,
    price: roundMoney(offer.price),
    originalPrice: original ? roundMoney(original) : null,
    saving: original ? roundMoney(original - offer.price) : 0,
    onSale: Boolean(original),
    discountPercent: offer.discountPercent || null,
    chain: displayChain(offer.chain),
    storeId: offer.storeId,
    storeName: displayStoreName(offer.storeName),
    address: [offer.street, [offer.zip, offer.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    lat: offer.lat,
    lng: offer.lng,
    distanceKm: offer.distanceKm,
    quantity: offer.quantity,
    validTo: offer.validTo,
    imageUrl: offer.imageUrl,
  };
}

const cheapest = (options) => options.reduce((a, b) => (b.price < a.price ? b : a));
const nearest = (options) => options.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));

/** Default option for an ingredient given the user's route priority. */
export function pickDefaultOption(options, priority = 'balanced') {
  if (!options.length) return null;
  if (priority === 'price') return cheapest(options).offerId;
  if (priority === 'distance') return nearest(options).offerId;
  return options[0].offerId; // 'balanced' → best price/distance score (already sorted)
}

/** The currently selected option of an ingredient line (or its first). */
export function selectedOption(ingredient) {
  if (!ingredient.options?.length) return null;
  return ingredient.options.find((o) => o.offerId === ingredient.selectedOfferId) || ingredient.options[0];
}

/**
 * Recompute store baskets + totals from each ingredient's *currently selected*
 * option. Called both at assembly time and whenever the user swaps an option
 * (e.g. cheaper-at-Lidl vs closer-at-REMA).
 */
export function deriveRecipe(recipe) {
  const items = [];
  for (const ing of recipe.ingredients) {
    const opt = selectedOption(ing);
    if (!opt) continue;
    // Cross-store saving: what you avoid paying vs the priciest shop near you
    // for this same item. This is our data-backed "Spar X" — only 2% of offers
    // carry a real normal-price discount, but every multi-store item has a spread.
    const prices = (ing.options || []).map((o) => o.price);
    const maxPrice = prices.length ? Math.max(...prices) : opt.price;
    const crossSaving = roundMoney(Math.min(opt.price, Math.max(0, maxPrice - opt.price))); // cap at item price
    const discountSaving = opt.saving || 0;
    const saving = roundMoney(Math.max(discountSaving, crossSaving));
    items.push({ ...opt, name: ing.name, saving, crossSaving, discountSaving, storeCount: prices.length });
  }
  const stores = aggregateStores(items);
  // Standard items: stocked everywhere, not on offer — so we have no real price
  // for them. Grab them at a store you're ALREADY visiting (answers "where"),
  // and the price is an honest estimate, clearly flagged as such (not a claim).
  const nearestStore = stores[0] || null;
  const standardItems = recipe.ingredients
    .filter((ing) => ing.standard && !ing.pantry && !selectedOption(ing))
    .map((ing) => ({
      name: ing.name,
      amount: ing.amount || '',
      estPrice: ing.estPrice ?? estimateStandardPrice(ing),
      storeName: nearestStore?.storeName || null, // where to grab it, if there's a route
      storeId: nearestStore?.storeId || null,
    }));
  const standardTotal = roundMoney(standardItems.reduce((s, i) => s + (i.estPrice || 0), 0));

  const matchedCount = recipe.ingredients.filter((ing) => ing.pantry || ing.standard || selectedOption(ing)).length;
  const homeCount = recipe.ingredients.filter((ing) => ing.pantry).length;
  const offerTotal = roundMoney(items.reduce((s, o) => s + (o.price || 0), 0));
  const totalEstimate = roundMoney(offerTotal + standardTotal);
  const totalSaving = roundMoney(items.reduce((s, o) => s + (o.saving || 0), 0));
  return {
    ...recipe,
    matchedCount,
    homeCount,
    totalCount: recipe.ingredients.length,
    offerTotal,
    standardItems,
    standardTotal,
    hasEstimate: standardItems.length > 0,
    totalEstimate,
    totalSaving,
    stores,
  };
}

// Three honest classes for every ingredient (no "Mangler pris" ever):
//   1. PÅ TILBUD   → matched to an offer; real price + cross-store saving.
//   2. BASISVARE   → cupboard seasoning you always have; 0 kr, assumed home.
//   3. STANDARDVARE→ not on this week's tilbud, but stocked in every shop; we
//                    show a clearly-labelled "ca." estimate so the basket is real.
// Our feed is offers-only (no full shelf catalogue), so 2+3 can't carry a true
// per-store price — but they're never "missing", just not discounted today.

// True cupboard seasonings — 0 kr, nobody buys these per meal.
const PANTRY_STAPLES = new Set([
  'salt', 'peber', 'sukker', 'mel', 'olie', 'olivenolie', 'rapsolie',
  'vand', 'eddike', 'bagepulver', 'bagepulvere',
]);

// Typical Danish store-brand prices (DKK) for everyday items rarely on a flyer
// but stocked everywhere. Labelled "ca." in the UI — an estimate, not a claim.
const STANDARD_PRICES = {
  hvidloeg: 8, parmesan: 25, bouillon: 12, groentsagsbouillon: 12, oksebouillon: 12,
  hoensebouillon: 12, oregano: 12, basilikum: 15, persille: 12, koriander: 12,
  timian: 12, rosmarin: 12, dild: 12, mynte: 12, svampe: 15, champignon: 15,
  hvidvin: 45, roedvin: 45, soja: 18, sojasovs: 18, sesam: 18, sesamfroe: 18,
  ingefaer: 10, chili: 8, chiliflager: 12, foraarsloeg: 10, pepperoni: 22,
  rasp: 10, kanel: 12, paprika: 14, spidskommen: 16, karry: 14, gaer: 6,
  tomatpure: 7, kokosmaelk: 12, creme: 18, smoer: 22, krydderier: 14,
};

const CATEGORY_PRICES = { meat: 38, fish: 42, dairy: 18, vegetable: 14, produce: 14, fruit: 16, bakery: 18, pantry: 14 };

function stapleHit(name, set) {
  const full = normalizeText(name);
  return set.has(full) || full.split(/\s+/).some((w) => set.has(w));
}

function isPantryStaple(ingredient) {
  return stapleHit(ingredient.name, PANTRY_STAPLES);
}

/** A clearly-approximate shelf price for a standard (non-offer) item. */
function estimateStandardPrice(ingredient) {
  const full = normalizeText(ingredient.name);
  for (const w of [full, ...full.split(/\s+/)]) {
    if (STANDARD_PRICES[w] != null) return STANDARD_PRICES[w];
  }
  return CATEGORY_PRICES[normalizeText(ingredient.category)] ?? 15;
}

/**
 * CASHIER stage (deterministic). Turn vetted candidate offers into ingredient
 * lines that each carry *all* store options, then derive baskets + totals.
 * @param selections [{ ingredient, candidates: rankedOffer[] }]
 */
export function assembleRecipe(meal, selections, priority = 'balanced') {
  const prefs = typeof priority === 'string' ? { priority } : priority || {};
  const ingredients = selections.map(({ ingredient, candidates }) => {
    const inPantry = isPantryIngredient(ingredient, prefs.pantryItems);
    const staple = isPantryStaple(ingredient);
    const atHome = inPantry || staple; // basisvarer never go on the buy list
    const options = atHome ? [] : (candidates || []).map(offerToOption);
    // Not at home and not on offer → a standard item: stocked everywhere, just
    // not discounted today. Carry a clearly-approximate price so it's never "missing".
    const standard = !atHome && options.length === 0;
    return {
      name: ingredient.name,
      amount: ingredient.amount || '',
      category: ingredient.category || '',
      matched: atHome || options.length > 0 || standard,
      pantry: atHome,
      staple, // distinguishes "basisvare" from a real pantry tick
      standard,
      estPrice: standard ? estimateStandardPrice(ingredient) : null,
      options,
      selectedOfferId: options.length ? pickDefaultOption(options, prefs.priority) : null,
    };
  });

  // CONSOLIDATE — buy from as few stores as possible. Picking the cheapest store
  // per ingredient independently scatters one dinner across 4-5 shops; nobody
  // does that. Bias toward 1-2 nearby stores even at a few kr more.
  const consolidated = consolidateStores(ingredients, {
    maxStops: prefs.maxStops ?? 2,
    priority: prefs.priority,
  });

  return deriveRecipe({
    id: meal.id,
    name: meal.name,
    cuisine: meal.cuisine,
    dietTags: meal.dietTags || [],
    time: meal.time,
    difficulty: meal.difficulty,
    sources: meal.sources || [],
    servings: meal.servings,
    description: meal.description,
    steps: meal.steps || [],
    ingredients: consolidated,
  });
}

/** All size 1..k subsets of `arr`. */
function subsetsUpTo(arr, k) {
  const out = [];
  const rec = (start, combo) => {
    if (combo.length) out.push(combo);
    if (combo.length === k) return;
    for (let i = start; i < arr.length; i++) rec(i + 1, [...combo, arr[i]]);
  };
  rec(0, []);
  return out;
}

/**
 * Reassign each ingredient's chosen store so the basket comes from the fewest
 * stores. Greedy over the nearest ~10 candidate stores: score every combo of up
 * to `maxStops` by coverage (dominant), then basket price + round-trip penalty.
 */
function consolidateStores(ingredients, { maxStops = 2, priority = 'balanced' } = {}) {
  const buyables = ingredients.filter((i) => i.options?.length);
  if (buyables.length < 2) return ingredients;

  const storeDist = new Map();
  buyables.forEach((i) =>
    i.options.forEach((o) => {
      if (!storeDist.has(o.storeId)) storeDist.set(o.storeId, o.distanceKm ?? 0);
    }),
  );
  const candidates = [...storeDist.keys()]
    .sort((a, b) => storeDist.get(a) - storeDist.get(b))
    .slice(0, 10);

  const distanceWeight = DISTANCE_WEIGHT[priority] ?? DISTANCE_WEIGHT.balanced;
  let best = null;
  for (const combo of subsetsUpTo(candidates, Math.max(1, maxStops))) {
    const set = new Set(combo);
    let cost = 0;
    let covered = 0;
    for (const ing of buyables) {
      const inCombo = ing.options.filter((o) => set.has(o.storeId));
      if (inCombo.length) {
        covered++;
        cost += bestInStore(inCombo).price;
      }
    }
    const trip = combo.reduce((sum, s) => sum + storeDist.get(s), 0) * 2; // ~there & back
    // Coverage dominates; then cheaper basket; then shorter trip; then fewer stops.
    // Ingredient-only price routes use priority='price': basket price wins
    // inside the chosen radius/chains/max-stop boundary. Distance and fewer
    // stops only break effectively equal totals.
    const score =
      priority === 'price'
        ? -covered * 1000 + cost + combo.length * 0.001 + trip * 0.0001
        : -covered * 1000 + cost + trip * distanceWeight + combo.length * 3;
    if (!best || score < best.score) best = { set, score };
  }
  if (!best) return ingredients;

  return ingredients.map((ing) => {
    if (!ing.options?.length) return ing;
    const inCombo = ing.options.filter((o) => best.set.has(o.storeId));
    const pool = inCombo.length ? inCombo : ing.options; // fall back to its own best
    return { ...ing, selectedOfferId: bestInStore(pool).offerId };
  });
}

// The core job: the CHEAPEST option, full stop. Being on sale is a nice label,
// but the user's win is "you didn't have to check every shop" — so we always
// pick the lowest price. The cross-store saving (vs the priciest shop) is then
// naturally maximised, and the "på tilbud" tag is shown when it happens to apply.
function bestInStore(options) {
  return options.reduce((a, b) => (b.price < a.price ? b : a));
}

/**
 * Convenience: Pantry → Cashier with no audit (heuristic shortlist per
 * ingredient). The audited path lives in lib/planner.js.
 */
export function matchRecipeOffers(meal, offers, userPos, prefs = {}) {
  const selections = (meal.ingredients || []).map((ingredient) => ({
    ingredient,
    candidates: rankCandidates(ingredient, offers, userPos, prefs, 8),
  }));
  return assembleRecipe(meal, selections, prefs);
}

/** Unique stores from matched ingredients, with the items to grab at each. */
export function aggregateStores(matchedIngredients) {
  const map = new Map();
  for (const item of matchedIngredients) {
    if (!item.storeId) continue;
    if (!map.has(item.storeId)) {
      map.set(item.storeId, {
        storeId: item.storeId,
        storeName: item.storeName,
        chain: item.chain,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        distanceKm: item.distanceKm,
        items: [],
        subtotal: 0,
      });
    }
    const store = map.get(item.storeId);
    store.items.push(item);
    store.subtotal = roundMoney(store.subtotal + (item.price || 0));
  }
  return [...map.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Build a compact, relevant offer list to feed DeepSeek as grounding context:
 * nearest + discounted offers within radius, deduped by product, capped.
 */
export function buildPromptOffers(offers, userPos, { radiusKm = 5, preferredStores = [], limit = 160 } = {}) {
  const preferred = new Set((preferredStores || []).map((s) => s.toLowerCase()));
  const seen = new Set();

  return offers
    .map((o) => withDistance(o, userPos))
    .filter((o) => o.distanceKm <= radiusKm)
    .filter((o) => !preferred.size || preferred.has((o.chain || '').toLowerCase()))
    .sort((a, b) => {
      const aPref = preferred.has((a.chain || '').toLowerCase()) ? 0 : 1;
      const bPref = preferred.has((b.chain || '').toLowerCase()) ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      const aDisc = a.discountPercent ? 0 : 1;
      const bDisc = b.discountPercent ? 0 : 1;
      if (aDisc !== bDisc) return aDisc - bDisc;
      return a.price - b.price;
    })
    .filter((o) => {
      const key = normalizeText(o.productName);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((o) => ({
      product: o.productName,
      chain: displayChain(o.chain),
      store: displayStoreName(o.storeName),
      price: o.price,
      keywords: o.keywords,
      distanceKm: roundMoney(o.distanceKm),
    }));
}
