import { loadOffers, resolveOffers, matchRecipeOffers } from './offers';

// Built-in weeknight meals priced against TODAY's real offers (no LLM, no wait).
// Used to give a brand-new user instant value on Home — "Vi har fundet måltider"
// — and as a graceful fallback when DeepSeek generation is unavailable. The
// ingredients use common Danish terms that are well represented in the offer feed.
const STARTER_MEALS = [
  {
    id: 'starter-pasta-kodsovs',
    name: 'Pasta med kødsovs',
    cuisine: 'italiensk',
    time: 30,
    difficulty: 'easy',
    servings: 2,
    description: 'Klassisk og mættende — hakket oksekød, tomat og pasta.',
    dietTags: [],
    steps: [
      'Svits løg og hvidløg i lidt olie.',
      'Tilsæt hakket oksekød og brun det.',
      'Hæld hakkede tomater i og lad simre 15 min.',
      'Kog pastaen og vend den i sovsen.',
    ],
    ingredients: [
      { name: 'Pasta', amount: '250 g', keywords: ['pasta', 'spaghetti', 'penne'] },
      { name: 'Hakket oksekød', amount: '400 g', keywords: ['hakket oksekoed', 'oksekoed', 'hakket'] },
      { name: 'Hakkede tomater', amount: '1 dåse', keywords: ['hakkede tomater', 'tomat', 'flåede tomater'] },
      { name: 'Løg', amount: '1 stk', keywords: ['loeg'] },
      { name: 'Hvidløg', amount: '2 fed', keywords: ['hvidloeg'] },
      { name: 'Gulerod', amount: '1 stk', keywords: ['gulerod', 'guleroedder'] },
    ],
  },
  {
    id: 'starter-kylling-karry',
    name: 'Kylling i karry med ris',
    cuisine: 'indisk',
    time: 35,
    difficulty: 'easy',
    servings: 2,
    description: 'Cremet karry med kylling, kokosmælk og ris.',
    dietTags: ['high-protein'],
    steps: [
      'Kog risen efter anvisning.',
      'Brun kylling i gryden med løg.',
      'Tilsæt karry og kokosmælk, lad simre 12 min.',
      'Server karryen over risen.',
    ],
    ingredients: [
      { name: 'Kyllingebryst', amount: '400 g', keywords: ['kyllingebryst', 'kylling', 'kyllingefilet'] },
      { name: 'Ris', amount: '2 dl', keywords: ['ris', 'jasminris', 'basmati'] },
      { name: 'Kokosmælk', amount: '1 dåse', keywords: ['kokosmaelk'] },
      { name: 'Løg', amount: '1 stk', keywords: ['loeg'] },
      { name: 'Gulerod', amount: '1 stk', keywords: ['gulerod', 'guleroedder'] },
      { name: 'Karry', amount: '2 tsk', keywords: ['karry'] },
    ],
  },
  {
    id: 'starter-frikadeller',
    name: 'Frikadeller med kartofler',
    cuisine: 'dansk',
    time: 40,
    difficulty: 'medium',
    servings: 2,
    description: 'Sprøde frikadeller med kogte kartofler.',
    dietTags: [],
    steps: [
      'Rør fars af hakket kød, æg, løg, rasp og mel.',
      'Form frikadeller og steg dem gyldne.',
      'Kog kartoflerne møre.',
      'Server med en grøntsag eller sauce.',
    ],
    ingredients: [
      { name: 'Hakket svinekød', amount: '400 g', keywords: ['hakket svinekoed', 'svinekoed', 'hakket flæsk', 'hakket'] },
      { name: 'Kartofler', amount: '600 g', keywords: ['kartofler', 'kartoffel', 'bagekartofler'] },
      { name: 'Løg', amount: '1 stk', keywords: ['loeg'] },
      { name: 'Æg', amount: '1 stk', keywords: ['aeg', 'æg'] },
      { name: 'Rasp', amount: '3 spsk', keywords: ['rasp'] },
      { name: 'Mel', amount: '2 spsk', keywords: ['mel', 'hvedemel'] },
    ],
  },
  {
    id: 'starter-laks-ris',
    name: 'Laks med ris og broccoli',
    cuisine: 'fisk',
    time: 25,
    difficulty: 'easy',
    servings: 2,
    description: 'Let og sund — ovnbagt laks med ris og grønt.',
    dietTags: ['high-protein', 'pescetar'],
    steps: [
      'Bag laksen i ovnen ved 200° i ca. 15 min.',
      'Kog risen.',
      'Damp broccolien få minutter.',
      'Server med et pift citron.',
    ],
    ingredients: [
      { name: 'Laks', amount: '2 stk', keywords: ['laks', 'laksefilet'] },
      { name: 'Ris', amount: '2 dl', keywords: ['ris', 'jasminris'] },
      { name: 'Broccoli', amount: '1 stk', keywords: ['broccoli'] },
      { name: 'Citron', amount: '1 stk', keywords: ['citron'] },
    ],
  },
  {
    id: 'starter-tomatsuppe',
    name: 'Tomatsuppe med brød',
    cuisine: 'vegetar',
    time: 25,
    difficulty: 'easy',
    servings: 2,
    description: 'Varmende tomatsuppe — billig og hurtig.',
    dietTags: ['vegetar'],
    steps: [
      'Svits løg og hvidløg.',
      'Tilsæt hakkede tomater og lidt vand, lad simre.',
      'Blend suppen glat og smag til.',
      'Server med brød.',
    ],
    ingredients: [
      { name: 'Hakkede tomater', amount: '2 dåser', keywords: ['hakkede tomater', 'tomat'] },
      { name: 'Løg', amount: '1 stk', keywords: ['loeg'] },
      { name: 'Hvidløg', amount: '2 fed', keywords: ['hvidloeg'] },
      { name: 'Fløde', amount: '1 dl', keywords: ['floede', 'madlavningsfloede'] },
      { name: 'Brød', amount: '½ stk', keywords: ['broed', 'rugbroed', 'flute'] },
    ],
  },
  {
    id: 'starter-cremet-pasta',
    name: 'Cremet pasta med kylling',
    cuisine: 'italiensk',
    time: 30,
    difficulty: 'easy',
    servings: 2,
    description: 'Cremet kyllingepasta med spinat.',
    dietTags: ['high-protein'],
    steps: [
      'Kog pastaen.',
      'Brun kylling med hvidløg.',
      'Tilsæt fløde og spinat, lad det tykne.',
      'Vend pastaen i og top med parmesan.',
    ],
    ingredients: [
      { name: 'Pasta', amount: '250 g', keywords: ['pasta', 'penne', 'tagliatelle'] },
      { name: 'Kyllingebryst', amount: '350 g', keywords: ['kyllingebryst', 'kylling'] },
      { name: 'Fløde', amount: '2 dl', keywords: ['floede', 'madlavningsfloede'] },
      { name: 'Spinat', amount: '100 g', keywords: ['spinat'] },
      { name: 'Hvidløg', amount: '2 fed', keywords: ['hvidloeg'] },
      { name: 'Parmesan', amount: '50 g', keywords: ['parmesan'] },
    ],
  },
];

const hasPriceData = (r) => Number(r.totalEstimate) > 0 && (r.stores?.length || 0) > 0 && (r.matchedCount || 0) > 0;

/**
 * Price the starter meals against today's offers at the user's location/params.
 * Returns recipes sorted by match quality + price — the same shape PlanMeal makes.
 */
export async function buildStarterPlan(position, prefs = {}) {
  const offers = resolveOffers(await loadOffers(position), position);
  const recipes = STARTER_MEALS.map((meal) =>
    matchRecipeOffers(meal, offers, position, {
      radiusKm: prefs.radiusKm ?? 5,
      preferredStores: prefs.preferredStores ?? [],
      priority: prefs.priority ?? 'balanced',
      maxStops: prefs.maxStops ?? 2,
      pantryItems: prefs.pantryItems ?? [],
    }),
  ).filter(hasPriceData);
  recipes.sort((a, b) => b.matchedCount - a.matchedCount || a.totalEstimate - b.totalEstimate);
  return recipes;
}
