import { normalizeText } from './geo.js';

export const AVOID_SUGGESTIONS = [
  'Sesam',
  'Alkohol',
  'Koriander',
  'Stærk chili',
  'Svampe',
  'Hvidløg',
  'Løg',
];

export const PANTRY_SUGGESTIONS = [
  'Ris',
  'Pasta',
  'Olie',
  'Salt',
  'Peber',
  'Mel',
  'Sukker',
  'Løg',
  'Hvidløg',
  'Sojasauce',
];

const GROUPS = {
  gluten: ['gluten', 'hvede', 'wheat', 'byg', 'rug', 'mel', 'broed', 'pasta', 'spaghetti', 'couscous', 'bulgur', 'rasp'],
  dairy: ['maelk', 'milk', 'floede', 'cream', 'smoer', 'butter', 'ost', 'cheese', 'yoghurt', 'skyr', 'mozzarella', 'parmesan', 'creme fraiche'],
  nuts: ['noed', 'mandel', 'peanut', 'jordnoed', 'cashew', 'pistacie', 'valnoed', 'hasselnoed', 'pecan'],
  shellfish: ['skaldyr', 'reje', 'shrimp', 'krabbe', 'hummer', 'musling', 'oesters'],
  egg: ['aeg', 'egg', 'mayonnaise', 'mayo'],
  soy: ['soja', 'soy', 'tofu', 'edamame', 'miso'],
  fish: ['fisk', 'fish', 'laks', 'salmon', 'tun', 'tuna', 'torsk', 'makrel', 'sild', 'ansjos'],
  pork: ['svin', 'svinekoed', 'pork', 'bacon', 'skinke', 'ham', 'chorizo', 'salami', 'pancetta', 'prosciutto', 'pepperoni'],
  meat: ['koed', 'meat', 'okse', 'beef', 'kalv', 'veal', 'kylling', 'chicken', 'kalkun', 'turkey', 'lam', 'lamb', 'and', 'duck'],
  alcohol: ['alkohol', 'alcohol', 'vin', 'wine', 'hvidvin', 'roedvin', 'portvin', 'cognac', 'rom', 'rum', 'oel', 'beer'],
  honey: ['honning', 'honey'],
};

const ALLERGY_GROUPS = {
  gluten: ['gluten'],
  laktose: ['dairy'],
  noedder: ['nuts'],
  skaldyr: ['shellfish'],
  aeg: ['egg'],
  soja: ['soy'],
  fisk: ['fish'],
  svinekod: ['pork'],
};

const DIET_GROUPS = {
  vegetar: ['meat', 'pork', 'fish', 'shellfish'],
  veganer: ['meat', 'pork', 'fish', 'shellfish', 'dairy', 'egg', 'honey'],
  pescetar: ['meat', 'pork'],
  glutenfri: ['gluten'],
  laktosefri: ['dairy'],
  'no-pork': ['pork'],
  'halal-friendly': ['pork', 'alcohol'],
  'kosher-friendly': ['pork', 'shellfish'],
};

export function splitPreferenceTerms(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  const seen = new Set();
  return source
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeText(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function recipeRestrictionConflicts(meal, preferences = {}) {
  const ingredientTexts = (meal.ingredients || []).map((ingredient) =>
    normalizeText([
      ingredient.name,
      ingredient.category,
      ...(ingredient.keywords || []),
    ].filter(Boolean).join(' ')),
  );
  const conflicts = [];

  const groupIds = new Set();
  for (const allergy of preferences.allergies || []) {
    for (const group of ALLERGY_GROUPS[normalizeText(allergy)] || []) groupIds.add(group);
  }
  for (const diet of preferences.dietaryPreferences || []) {
    for (const group of DIET_GROUPS[normalizeText(diet)] || []) groupIds.add(group);
  }

  for (const groupId of groupIds) {
    const hit = ingredientTexts.find((text) => (GROUPS[groupId] || []).some((term) => containsTerm(text, term)));
    if (hit) conflicts.push({ type: groupId, ingredient: hit });
  }

  for (const custom of splitPreferenceTerms(preferences.customAvoids)) {
    const terms = customBlockedTerms(custom);
    const hit = ingredientTexts.find((text) => terms.some((term) => containsTerm(text, term)));
    if (hit) conflicts.push({ type: 'custom', term: custom, ingredient: hit });
  }

  return conflicts;
}

export function filterMealsForPreferences(meals, preferences = {}) {
  const accepted = [];
  const rejected = [];
  for (const meal of meals || []) {
    const conflicts = recipeRestrictionConflicts(meal, preferences);
    if (conflicts.length) rejected.push({ meal, conflicts });
    else accepted.push(meal);
  }
  return { accepted, rejected };
}

function customBlockedTerms(custom) {
  const term = normalizeText(custom);
  if (/(alkohol|alcohol)/.test(term)) return GROUPS.alcohol;
  if (/(ingen svin|no pork|halal|kosher)/.test(term)) return GROUPS.pork;
  if (term === 'staerk chili') return ['chili', 'chiliflager', 'chilisauce'];
  return [term];
}

function containsTerm(text, rawTerm) {
  const term = normalizeText(rawTerm);
  if (!term || !text) return false;
  if (term.includes(' ')) return ` ${text} `.includes(` ${term} `);
  return text.split(' ').some((word) =>
    word === term || (term.length >= 4 && (word.startsWith(term) || word.endsWith(term))),
  );
}
