// Static reference data for the demo. Kept tiny and declarative so screens can
// map over it without bespoke markup.

export const APP_NAME = 'KøbSmart';

// Aarhus C — fallback location when GPS is denied/unavailable.
export const AARHUS_C = { lat: 56.1567, lng: 10.2106 };

// Use the device's real GPS (navigator.geolocation). Aarhus C remains the
// fallback when permission is denied/unavailable. Set to true only to force the
// pinned Aarhus location for offline/demo runs where the offer data is Aarhus-only.
export const DEMO_FORCE_LOCATION = false;

// Cuisine is chosen per meal-plan, NOT stored as a profile preference.
export const CUISINES = [
  { id: 'dansk', label: 'Dansk' },
  { id: 'italiensk', label: 'Italiensk' },
  { id: 'mexicansk', label: 'Mexicansk' },
  { id: 'indisk', label: 'Indisk' },
  { id: 'thailandsk', label: 'Thai' },
  { id: 'japansk', label: 'Japansk' },
  { id: 'kinesisk', label: 'Kinesisk' },
  { id: 'vietnamesisk', label: 'Vietnamesisk' },
  { id: 'middelhavet', label: 'Middelhavet' },
];

export function cuisineLabel(id) {
  return CUISINES.find((c) => c.id === id)?.label || 'Måltid';
}

export function cuisineCode(id) {
  return cuisineLabel(id).slice(0, 2).toUpperCase();
}

// Dietary preferences — set at signup/setup, editable only from Profile.
export const DIETARY_PREFERENCES = [
  { id: 'vegetar', label: 'Vegetar' },
  { id: 'veganer', label: 'Veganer' },
  { id: 'pescetar', label: 'Pescetar' },
  { id: 'high-protein', label: 'Højt protein' },
  { id: 'low-carb', label: 'Low carb' },
  { id: 'glutenfri', label: 'Glutenfri' },
  { id: 'laktosefri', label: 'Laktosefri' },
  { id: 'no-pork', label: 'Ingen svinekød' },
  { id: 'halal-friendly', label: 'Halal-venlig' },
  { id: 'kosher-friendly', label: 'Kosher-venlig' },
];

export const ALLERGIES = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'laktose', label: 'Laktose' },
  { id: 'noedder', label: 'Nødder' },
  { id: 'skaldyr', label: 'Skaldyr' },
  { id: 'aeg', label: 'Æg' },
  { id: 'soja', label: 'Soja' },
  { id: 'fisk', label: 'Fisk' },
  { id: 'svinekod', label: 'Svinekød' },
];

// Chains present in the scraped offer data (see offers.json meta.store_chains).
export const STORE_CHAINS = [
  'Netto',
  'REMA 1000',
  '365discount',
  'Føtex',
  'Lidl',
  'SuperBrugsen',
  'Bilka',
  'MENY',
  'SPAR',
  'Løvbjerg',
];

export const TRANSPORT_MODES = [
  { id: 'walking', label: 'Gå', speedKmh: 5, profile: 'walking' },
  { id: 'cycling', label: 'Cykel', speedKmh: 16, profile: 'cycling' },
  { id: 'driving', label: 'Bil', speedKmh: 35, profile: 'driving' },
];

export const ROUTE_PRIORITIES = [
  { id: 'price', label: 'Laveste pris', hint: 'Find de absolut billigste tilbud' },
  { id: 'distance', label: 'Korteste rute', hint: 'Hold turen så kort som muligt' },
  { id: 'balanced', label: 'Balanceret', hint: 'Vej pris og afstand op mod hinanden' },
];

export const DEFAULT_ROUTE_PREFERENCES = {
  transport: 'cycling',
  radiusKm: 5,
  maxStops: 2, // consolidate the trip — 2 nearby stores, not 5 scattered ones
  priority: 'balanced',
};
