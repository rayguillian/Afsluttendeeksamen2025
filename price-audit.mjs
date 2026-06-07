import { readFileSync } from 'node:fs';
import { haversineKm, normalizeText, roundMoney } from './src/lib/geo.js';
import { matchRecipeOffers, selectedOption } from './src/lib/offers.js';

const ORIGIN = { lat: 56.1567, lng: 10.2106 };
const RADIUS_KM = 5;
const raw = JSON.parse(readFileSync('./public/data/offers.json', 'utf8'));
const offers = (raw.offers || [])
  .filter((offer) => Number.isFinite(Number(offer.price_dkk)) && Number(offer.price_dkk) > 0)
  .map((offer, index) => ({
    id: offer.source_offer_id || `offer-${index}`,
    productName: offer.product_name,
    chain: offer.chain,
    storeId: offer.store_id,
    storeName: offer.store_name,
    street: offer.street,
    zip: offer.zip,
    city: offer.city,
    lat: Number(offer.latitude),
    lng: Number(offer.longitude),
    price: Number(offer.price_dkk),
    originalPrice: Number(offer.original_price_dkk) || null,
    discountPercent: Number(offer.discount_percent) || null,
    quantity: offer.quantity_text,
    validTo: offer.valid_to,
    imageUrl: offer.image_url,
    keywords: offer.ingredient_keywords || '',
    words: normalizeText(`${offer.product_name} ${offer.normalized_product_name} ${offer.ingredient_keywords}`).split(' ').filter(Boolean),
  }));

const meals = [
  {
    id: 'audit-curry',
    name: 'Kylling i karry',
    ingredients: [{ name: 'Kyllingebryst' }, { name: 'Kokosmælk' }, { name: 'Ris' }, { name: 'Broccoli' }],
  },
  {
    id: 'audit-pasta',
    name: 'Pasta med tomat',
    ingredients: [{ name: 'Pasta' }, { name: 'Tomater' }, { name: 'Mozzarella' }, { name: 'Basilikum' }],
  },
  {
    id: 'audit-stirfry',
    name: 'Oksekød med nudler',
    ingredients: [{ name: 'Oksekød' }, { name: 'Risnudler' }, { name: 'Gulerødder' }, { name: 'Sojasauce' }],
  },
];

const scenarios = [
  { name: 'Alle kæder', preferredStores: [] },
  { name: 'Netto + REMA 1000', preferredStores: ['Netto', 'REMA 1000'] },
  { name: 'Føtex + Lidl', preferredStores: ['Føtex', 'Lidl'] },
];

let failures = 0;
let checkedItems = 0;
for (const scenario of scenarios) {
  console.log(`\n=== ${scenario.name} · ${RADIUS_KM} km ===`);
  const allowed = new Set(scenario.preferredStores.map((chain) => chain.toLowerCase()));
  for (const meal of meals) {
    const recipe = matchRecipeOffers(meal, offers, ORIGIN, {
      radiusKm: RADIUS_KM,
      preferredStores: scenario.preferredStores,
      maxStops: 2,
      priority: 'balanced',
      pantryItems: [],
    });
    const routeStoreIds = new Set(recipe.stores.map((store) => store.storeId));
    const selectedItems = [];

    for (const ingredient of recipe.ingredients) {
      const selected = selectedOption(ingredient);
      if (!selected) continue;
      checkedItems += 1;
      selectedItems.push(selected);
      const inRoute = ingredient.options.filter((option) => routeStoreIds.has(option.storeId));
      const cheapestInRoute = Math.min(...inRoute.map((option) => option.price));
      const checks = [
        ['cheapest vetted option in final route stores', selected.price === cheapestInRoute],
        ['inside 5 km radius', selected.distanceKm <= RADIUS_KM],
        ['inside selected chains', !allowed.size || allowed.has(String(selected.chain).toLowerCase())],
      ];
      for (const [label, pass] of checks) {
        if (!pass) {
          failures += 1;
          console.log(`FAIL ${meal.name} · ${ingredient.name}: ${label}`);
        }
      }
      console.log(`PASS ${meal.name} · ${ingredient.name}: ${selected.chain} / ${selected.storeName} · ${selected.price.toFixed(2)} kr · ${selected.distanceKm.toFixed(2)} km`);
    }

    const offerTotal = roundMoney(selectedItems.reduce((sum, item) => sum + item.price, 0));
    const storeTotal = roundMoney(recipe.stores.reduce((sum, store) => sum + store.subtotal, 0));
    const estimatedTotal = roundMoney(offerTotal + recipe.standardTotal);
    const savingTotal = roundMoney(recipe.stores.reduce((sum, store) => sum + store.items.reduce((inner, item) => inner + item.saving, 0), 0));
    const statsPass =
      offerTotal === recipe.offerTotal &&
      storeTotal === recipe.offerTotal &&
      estimatedTotal === recipe.totalEstimate &&
      savingTotal === recipe.totalSaving &&
      recipe.stores.every((store) => haversineKm(ORIGIN, store) <= RADIUS_KM) &&
      recipe.stores.every((store) => !allowed.size || allowed.has(String(store.chain).toLowerCase()));
    if (!statsPass) failures += 1;
    console.log(`${statsPass ? 'PASS' : 'FAIL'} ${meal.name} totals: offer ${recipe.offerTotal.toFixed(2)} · estimate ${recipe.totalEstimate.toFixed(2)} · saving ${recipe.totalSaving.toFixed(2)} · ${recipe.stores.length} stores`);
  }
}

console.log(`\n=== VERDICT ===`);
console.log(`${checkedItems} selected ingredient prices checked · ${failures} failures`);
if (failures) process.exitCode = 1;
