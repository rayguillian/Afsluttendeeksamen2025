import assert from 'node:assert/strict';
import { buildCuisineTargets, mergeDistinctMeals, missingCuisineTargets, selectAvailableCuisineMix, selectCuisineQuota } from './src/lib/cuisineQuota.js';

const targets = buildCuisineTargets(['Italiensk', 'Japansk', 'Dansk'], 0);
const firstPass = [
  { name: 'Pasta', cuisine: 'Italian' },
  { name: 'Ramen', cuisine: 'JAPANSK' },
  { name: 'Sushi', cuisine: 'Japansk' },
];
const missing = missingCuisineTargets(firstPass, targets);

assert.deepEqual(missing, [{ cuisine: 'Dansk', count: 2 }]);

const repaired = mergeDistinctMeals(firstPass, [
  { name: 'Frikadeller', cuisine: 'Dansk' },
  { name: 'Biksemad', cuisine: 'Dansk' },
  { name: 'Pasta', cuisine: 'Italiensk' },
]);
const selected = selectCuisineQuota(repaired, targets);

assert.equal(selected.length, 4);
assert.equal(selected.filter((meal) => meal.cuisine.toLowerCase() === 'dansk').length, 2);
assert.equal(repaired.length, 5);

const partial = selectAvailableCuisineMix(firstPass, targets, 4);
assert.equal(partial.length, 3);

console.log('PASS missing cuisine slots are calculated from usable recipes');
console.log('PASS focused repair recipes complete the requested four-meal quota');
console.log('PASS duplicate repair recipes are ignored');
console.log('PASS English and Danish cuisine labels match without a false failure');
console.log('PASS valid partial results remain usable after bounded repairs');
