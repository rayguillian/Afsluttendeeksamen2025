const FOOD_IMAGES = [
  {
    keys: ['thai', 'vietnamesisk', 'kinesisk', 'japansk', 'nudel', 'wok', 'ris'],
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keys: ['italiensk', 'pasta', 'tomat', 'pizza'],
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keys: ['indisk', 'curry', 'dal', 'karry'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keys: ['mexicansk', 'taco', 'bønne', 'majs'],
    url: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keys: ['salat', 'grønt', 'vegetar', 'middelhavet'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keys: ['fisk', 'reje', 'laks'],
    url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
  },
];

const FALLBACKS = [
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
];

export function mealImage(recipe) {
  const haystack = [
    recipe?.name,
    recipe?.description,
    recipe?.cuisine,
    ...(recipe?.dietTags || []),
    ...(recipe?.ingredients || []).map((ing) => ing.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const match = FOOD_IMAGES.find((image) => image.keys.some((key) => haystack.includes(key)));
  if (match) return match.url;
  const seed = String(recipe?.id || recipe?.name || 'kobsmart').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACKS[seed % FALLBACKS.length];
}
