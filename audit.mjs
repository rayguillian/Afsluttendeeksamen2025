// Headless user-journey audit. Runs the REAL matching pipeline (offers.js)
// against the REAL 16k-offer dataset from Aarhus C. No browser, no LLM.
// Goal: be ruthless about what the user actually experiences.
import { readFileSync } from 'node:fs';
import { haversineKm, normalizeText } from './src/lib/geo.js';
import { matchRecipeOffers } from './src/lib/offers.js';

const AARHUS_C = { lat: 56.1567, lng: 10.2106 };
const raw = JSON.parse(readFileSync('./public/data/offers.json', 'utf8'));

// Normalise exactly like loadOffers() does in the app.
const offers = (raw.offers || [])
  .filter((o) => Number.isFinite(Number(o.price_dkk)) && Number(o.price_dkk) > 0)
  .map((o, index) => ({
    id: o.source_offer_id || `offer-${index}`,
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
    quantity: o.quantity_text,
    validTo: o.valid_to,
    imageUrl: o.image_url,
    keywords: o.ingredient_keywords || '',
    words: normalizeText(`${o.product_name} ${o.normalized_product_name} ${o.ingredient_keywords}`)
      .split(' ')
      .filter(Boolean),
  }));

console.log(`\n=== DATASET ===`);
console.log(`${offers.length} priced offers · ${new Set(offers.map((o) => o.storeId)).size} stores · origin Aarhus C`);

// Three realistic meals across the multi-cuisine request the user described.
const MEALS = [
  {
    id: 'it-1', name: 'Spaghetti aglio e olio', cuisine: 'italiensk',
    ingredients: [
      { name: 'Spaghetti' }, { name: 'Hvidløg' }, { name: 'Olivenolie' },
      { name: 'Parmesan' }, { name: 'Persille' }, { name: 'Chiliflager' },
      { name: 'Salt' }, { name: 'Peber' },
    ],
  },
  {
    id: 'dk-1', name: 'Frikadeller med kartofler', cuisine: 'dansk',
    ingredients: [
      { name: 'Hakket svinekød' }, { name: 'Kartofler' }, { name: 'Løg' },
      { name: 'Æg' }, { name: 'Rasp' }, { name: 'Mælk' }, { name: 'Salt' }, { name: 'Peber' },
    ],
  },
  {
    id: 'jp-1', name: 'Teriyaki kylling med ris', cuisine: 'japansk',
    ingredients: [
      { name: 'Kyllingebryst' }, { name: 'Ris' }, { name: 'Sojasovs' },
      { name: 'Forårsløg' }, { name: 'Hvidløg' }, { name: 'Ingefær' }, { name: 'Sesam' },
    ],
  },
];

const prefs = { radiusKm: 5, priority: 'balanced', preferredStores: [], pantryItems: [] };
const STAPLES = ['salt', 'peber', 'hvidloeg', 'parmesan', 'rasp', 'olie', 'olivenolie', 'mel', 'sukker', 'sesam', 'ingefaer'];

let totalIng = 0, totalMatched = 0, totalMissing = 0, totalHome = 0;
let totalKm = 0, totalSaved = 0, totalStops = 0;
const allMissing = new Set();

for (const meal of MEALS) {
  const recipe = matchRecipeOffers(meal, offers, AARHUS_C, prefs);
  const ings = recipe.ingredients;
  const matched = ings.filter((i) => i.options?.length);
  const atHome = ings.filter((i) => i.pantry);
  const missing = ings.filter((i) => !i.pantry && !i.standard && !(i.options && i.options.length));
  totalIng += ings.length; totalMatched += matched.length;
  totalMissing += missing.length; totalHome += atHome.length;

  // Round-trip distance: home → each store (nearest-first) → home.
  const stores = [...recipe.stores].sort((a, b) => a.distanceKm - b.distanceKm);
  let trip = 0, cur = AARHUS_C;
  for (const s of stores) { trip += haversineKm(cur, { lat: s.lat, lng: s.lng }); cur = s; }
  trip += haversineKm(cur, AARHUS_C);
  totalKm += trip; totalSaved += recipe.totalSaving; totalStops += stores.length;

  console.log(`\n=== ${meal.cuisine.toUpperCase()} · ${meal.name} ===`);
  console.log(`  matched ${matched.length}/${ings.length} · stores ${stores.length} · round-trip ${trip.toFixed(1)} km · total ${recipe.totalEstimate} kr · saved ${recipe.totalSaving} kr`);
  for (const i of (recipe.standardItems || [])) console.log(`  ~ STANDARD: ${i.name} ca. ${i.estPrice} kr (fås overalt, ikke på tilbud)`);
  for (const i of missing) {
    allMissing.add(i.name);
    console.log(`  ✗ MANGLER PRIS: ${i.name}`);
  }
  // Flag suspicious matches (false positives like salt -> saltede peanuts).
  for (const i of matched) {
    const best = i.options[0];
    const t = normalizeText(i.name);
    const prod = normalizeText(best.productName);
    const tokenHit = prod.split(' ').some((w) => w === t || w.startsWith(t));
    if (!tokenHit && t.length >= 4) {
      console.log(`  ⚠ SUSPECT MATCH: "${i.name}" -> "${best.productName}" (${best.chain}, ${best.price} kr)`);
    }
  }
  console.log(`  stores: ${stores.map((s) => `${s.chain}@${s.distanceKm.toFixed(1)}km`).join(', ')}`);
}

console.log(`\n=== VERDICT ===`);
const covered = totalMatched + totalHome;
console.log(`Effective coverage: ${covered}/${totalIng} (${Math.round((covered / totalIng) * 100)}%)  =  ${totalMatched} bought + ${totalHome} basisvarer hjemme`);
console.log(`Genuine gaps ("Mangler pris"): ${totalMissing}  ->  ${[...allMissing].join(', ')}`);
console.log(`Avg per meal: ${(totalStops / MEALS.length).toFixed(1)} stops · ${(totalKm / MEALS.length).toFixed(1)} km round-trip · ${(totalSaved / MEALS.length).toFixed(0)} kr saved`);
