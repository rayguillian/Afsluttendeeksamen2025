import { normalizeText } from './geo.js';

const CUISINE_ALIASES = {
  danish: 'dansk',
  dansk: 'dansk',
  italian: 'italiensk',
  italiensk: 'italiensk',
  mexican: 'mexicansk',
  mexicansk: 'mexicansk',
  indian: 'indisk',
  indisk: 'indisk',
  thai: 'thai',
  thailandsk: 'thai',
  japanese: 'japansk',
  japansk: 'japansk',
  chinese: 'kinesisk',
  kinesisk: 'kinesisk',
  vietnamese: 'vietnamesisk',
  vietnamesisk: 'vietnamesisk',
  mediterranean: 'middelhavet',
  middelhavet: 'middelhavet',
};

export function cuisineKey(value) {
  const key = normalizeText(value);
  return CUISINE_ALIASES[key] || key;
}

export function buildCuisineTargets(labels, rotation = 0) {
  const countsBySize = {
    1: [4],
    2: [2, 2],
    3: [1, 1, 2],
    4: [1, 1, 1, 1],
  };
  const counts = [...(countsBySize[labels.length] || [])];
  if (labels.length === 3) {
    const doubleIndex = (rotation + 2) % 3;
    counts.fill(1);
    counts[doubleIndex] = 2;
  }
  return labels.map((cuisine, index) => ({ cuisine, count: counts[index] }));
}

export function selectCuisineQuota(meals, targets) {
  const remaining = [...meals];
  const selected = [];
  for (const target of targets) {
    const label = cuisineKey(target.cuisine);
    for (let i = 0; i < target.count; i += 1) {
      const index = remaining.findIndex((meal) => cuisineKey(meal.cuisine) === label);
      if (index === -1) return [];
      selected.push(remaining.splice(index, 1)[0]);
    }
  }
  return selected;
}

export function missingCuisineTargets(meals, targets) {
  const available = new Map();
  for (const meal of meals || []) {
    const key = cuisineKey(meal.cuisine);
    available.set(key, (available.get(key) || 0) + 1);
  }

  return (targets || [])
    .map((target) => ({
      cuisine: target.cuisine,
      count: Math.max(0, Number(target.count || 0) - (available.get(cuisineKey(target.cuisine)) || 0)),
    }))
    .filter((target) => target.count > 0);
}

export function mergeDistinctMeals(...groups) {
  const seen = new Set();
  return groups.flat().filter((meal) => {
    const key = `${cuisineKey(meal?.cuisine)}:${normalizeText(meal?.name)}`;
    if (!meal || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectAvailableCuisineMix(meals, targets, limit = 4) {
  const allowed = new Set((targets || []).map((target) => cuisineKey(target.cuisine)));
  const selected = [];
  const remaining = [...(meals || [])];

  for (const target of targets || []) {
    for (let index = 0; index < Number(target.count || 0); index += 1) {
      const found = remaining.findIndex((meal) => cuisineKey(meal.cuisine) === cuisineKey(target.cuisine));
      if (found !== -1) selected.push(remaining.splice(found, 1)[0]);
    }
  }

  for (const meal of remaining) {
    if (selected.length >= limit) break;
    if (allowed.has(cuisineKey(meal.cuisine))) selected.push(meal);
  }
  return selected.slice(0, limit);
}
