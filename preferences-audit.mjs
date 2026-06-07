import assert from 'node:assert/strict';
import { filterMealsForPreferences, recipeRestrictionConflicts, splitPreferenceTerms } from './src/lib/preferences.js';
import { matchRecipeOffers } from './src/lib/offers.js';

const porkMeal = {
  name: 'Pasta med bacon',
  ingredients: [{ name: 'Pasta' }, { name: 'Bacon' }],
};
const sesameMeal = {
  name: 'Sesamnudler',
  ingredients: [{ name: 'Risnudler' }, { name: 'Sesamfrø' }],
};
const wineMeal = {
  name: 'Risotto',
  ingredients: [{ name: 'Ris' }, { name: 'Hvidvin' }],
};
const safeMeal = {
  id: 'safe',
  name: 'Tomatris',
  cuisine: 'test',
  ingredients: [{ name: 'Ris' }, { name: 'Tomater' }],
};

assert.equal(recipeRestrictionConflicts(porkMeal, { dietaryPreferences: ['no-pork'] }).length > 0, true);
assert.equal(recipeRestrictionConflicts(sesameMeal, { customAvoids: 'Sesam' }).length > 0, true);
assert.equal(recipeRestrictionConflicts(wineMeal, { customAvoids: 'Alkohol' }).length > 0, true);
assert.deepEqual(filterMealsForPreferences([porkMeal, safeMeal], { allergies: ['svinekod'] }).accepted, [safeMeal]);
assert.deepEqual(splitPreferenceTerms('Sesam, alkohol; sesam\nKoriander'), ['Sesam', 'alkohol', 'Koriander']);

const pantryPlan = matchRecipeOffers(safeMeal, [], { lat: 56.1567, lng: 10.2106 }, { pantryItems: ['ris'] });
const rice = pantryPlan.ingredients.find((ingredient) => ingredient.name === 'Ris');
assert.equal(rice.pantry, true);
assert.equal(rice.options.length, 0);
assert.equal(pantryPlan.homeCount, 1);

const noodlePlan = matchRecipeOffers(
  { ...safeMeal, ingredients: [{ name: 'Risnudler' }] },
  [],
  { lat: 56.1567, lng: 10.2106 },
  { pantryItems: ['ris'] },
);
assert.equal(noodlePlan.ingredients[0].pantry, false);

console.log('PASS deterministic restrictions reject pork and custom exclusions');
console.log('PASS tag values are parsed and deduplicated');
console.log('PASS pantry ingredients are removed from shopping options and counted at home');
console.log('PASS pantry matching does not confuse rice with rice noodles');
