// Data-integrity audit of public/data/offers.json. Pure fs read — no app imports.
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('./public/data/offers.json', 'utf8'));
const offers = d.offers || [];
const stores = d.stores || [];
const meta = d.meta || {};

// Greater-Aarhus bounding box (generous).
const BOX = { latMin: 55.9, latMax: 56.45, lngMin: 9.8, lngMax: 10.55 };
const inBox = (lat, lng) => lat >= BOX.latMin && lat <= BOX.latMax && lng >= BOX.lngMin && lng <= BOX.lngMax;

console.log(`\n========== PROVENANCE ==========`);
console.log(`source: ${meta.source}   scraped: ${meta.scraped_at}`);
console.log(`meta says: ${meta.offer_count} offers · ${meta.store_count} stores`);
console.log(`file has:  ${offers.length} offers · ${stores.length} stores array`);

console.log(`\n========== COORDINATE INTEGRITY (offers) ==========`);
let noCoord = 0, outBox = 0;
const outExamples = [];
for (const o of offers) {
  const lat = Number(o.latitude), lng = Number(o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { noCoord++; continue; }
  if (!inBox(lat, lng)) { outBox++; if (outExamples.length < 6) outExamples.push(`${o.chain} ${o.store_name} @ ${lat.toFixed(3)},${lng.toFixed(3)} (${o.city})`); }
}
console.log(`missing/zero coords: ${noCoord}`);
console.log(`outside Aarhus box:  ${outBox} (${Math.round(outBox/offers.length*100)}%)`);
outExamples.forEach((e) => console.log(`   ⚠ ${e}`));

console.log(`\n========== STORE CORRESPONDENCE ==========`);
// Unique stores referenced by offers vs the stores[] array.
const offerStoreIds = new Map(); // id -> {name, lat, lng, chain}
for (const o of offers) {
  if (!o.store_id) continue;
  if (!offerStoreIds.has(o.store_id)) offerStoreIds.set(o.store_id, { name: o.store_name, lat: +o.latitude, lng: +o.longitude, chain: o.chain });
}
console.log(`distinct store_ids in offers: ${offerStoreIds.size}`);
console.log(`stores[] array length:        ${stores.length}`);
// store_id that maps to >1 coordinate (data corruption)
const idCoords = new Map();
for (const o of offers) {
  if (!o.store_id) continue;
  const key = `${(+o.latitude).toFixed(4)},${(+o.longitude).toFixed(4)}`;
  if (!idCoords.has(o.store_id)) idCoords.set(o.store_id, new Set());
  idCoords.get(o.store_id).add(key);
}
const multiCoord = [...idCoords.entries()].filter(([, s]) => s.size > 1);
console.log(`store_ids with conflicting coordinates: ${multiCoord.length}`);
multiCoord.slice(0, 5).forEach(([id, s]) => console.log(`   ⚠ ${id}: ${[...s].join(' | ')}`));
// stores referenced in offers but missing from stores[]
if (stores.length) {
  const storeArrIds = new Set(stores.map((s) => s.store_id || s.id));
  const orphan = [...offerStoreIds.keys()].filter((id) => !storeArrIds.has(id));
  console.log(`offer store_ids NOT in stores[]: ${orphan.length}`);
}

console.log(`\n========== NON-GROCERY CONTAMINATION ==========`);
const NONFOOD = /macbook|iphone|ipad|samsung|tv\b|fjernsyn|laptop|computer|airpods|playstation|xbox|cykel|commuter|el-løbehjul|løbehjul|tøj|jakke|bukser|sko\b|sneakers|parfume|smykke|ur\b|legetøj|værktøj|batteri|dæk\b|playmobil|lego/i;
const contaminated = offers.filter((o) => NONFOOD.test(`${o.product_name} ${o.normalized_product_name}`));
console.log(`obvious non-food offers: ${contaminated.length} (${Math.round(contaminated.length/offers.length*100)}%)`);
contaminated.slice(0, 8).forEach((o) => console.log(`   ⚠ ${o.chain}: ${o.product_name} — ${o.price_dkk} kr`));

console.log(`\n========== PRICE SANITY ==========`);
const prices = offers.map((o) => Number(o.price_dkk)).filter((p) => Number.isFinite(p));
prices.sort((a, b) => a - b);
const pct = (p) => prices[Math.floor(prices.length * p)];
console.log(`min ${prices[0]} · p50 ${pct(0.5)} · p90 ${pct(0.9)} · p99 ${pct(0.99)} · max ${prices[prices.length-1]} kr`);
const over300 = offers.filter((o) => Number(o.price_dkk) > 300);
console.log(`offers over 300 kr (likely non-food): ${over300.length}`);
over300.slice(0, 6).forEach((o) => console.log(`   ⚠ ${o.chain}: ${o.product_name} — ${o.price_dkk} kr`));

console.log(`\n========== CHAIN BREAKDOWN ==========`);
const byChain = {};
for (const o of offers) byChain[o.chain] = (byChain[o.chain] || 0) + 1;
Object.entries(byChain).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`   ${c.padEnd(16)} ${n}`));
