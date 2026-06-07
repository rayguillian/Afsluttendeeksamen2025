import { rankCandidates, assembleRecipe } from './offers';
import { verifyMatches } from './api';

// ---------------------------------------------------------------------------
// Meal-planning pipeline — a "checks and balances" flow inspired by the
// StrangeLoop multi-agent architecture (creative model proposes, deterministic
// code + a cheap audit model verify):
//
//   Chef     (DeepSeek, large model) → recipes              [done upstream]
//   Pantry   (deterministic)         → shortlist real offers per ingredient
//   Auditor  (DeepSeek, small model) → keep only products that ARE the ingredient
//   Cashier  (deterministic)         → roll up store options, prices, totals
//
// Each stage owns one job. Prices/stores never come from the creative model;
// they come from real scraped offers the Auditor has vetted. The Auditor returns
// *every* genuine match (not one) so each ingredient keeps all its store options
// — cheapest-at-Lidl vs closest-at-REMA — for the shopper to choose between.
// Every LLM step degrades gracefully — without it the heuristic shortlist stands.
// ---------------------------------------------------------------------------

const CANDIDATES_PER_INGREDIENT = 8;

/**
 * @param meals    raw DeepSeek meals (each with id, cuisine, ingredients[])
 * @param offers   loaded offer list
 * @param userPos  live (or estimated) {lat,lng}
 * @param prefs    { radiusKm, preferredStores, priority }
 * @param audit    run the Auditor pass (only when DeepSeek is available)
 * @returns {Promise<{recipes: object[], audited: boolean}>}
 */
export async function planRecipes({ meals, offers, userPos, prefs, audit = true }) {
  // PANTRY — shortlist candidate offers per ingredient (deterministic).
  const perMeal = meals.map((meal) => ({
    meal,
    ranked: (meal.ingredients || []).map((ingredient) => ({
      ingredient,
      candidates: rankCandidates(ingredient, offers, userPos, prefs, CANDIDATES_PER_INGREDIENT),
    })),
  }));

  // AUDITOR — let the cheap model confirm/reject each shortlist.
  let verdict = {};
  if (audit) {
    const items = [];
    perMeal.forEach((m, mi) =>
      m.ranked.forEach((r, ii) => {
        if (r.candidates.length) {
          items.push({
            id: `${mi}.${ii}`,
            ingredient: r.ingredient.name,
            candidates: r.candidates.map((c) => ({
              id: c.id,
              product: c.productName,
              chain: c.chain,
              price: c.price,
            })),
          });
        }
      }),
    );
    if (items.length) {
      try {
        const { results } = await verifyMatches({ items });
        verdict = results || {};
      } catch {
        verdict = {}; // graceful: heuristic top candidate stands
      }
    }
  }

  const audited = Object.keys(verdict).length > 0;

  // CASHIER — keep every vetted candidate as a store option; the default pick
  // follows the user's route priority (price / distance / balanced).
  const recipes = perMeal.map((m, mi) =>
    assembleRecipe(
      m.meal,
      m.ranked.map((r, ii) => {
        const key = `${mi}.${ii}`;
        let candidates = r.candidates; // heuristic default = whole shortlist
        if (key in verdict) {
          const okIds = new Set(verdict[key]); // Auditor whitelist (may be empty)
          candidates = r.candidates.filter((c) => okIds.has(c.id));
        }
        return { ingredient: r.ingredient, candidates };
      }),
      prefs,
    ),
  );

  return { recipes, audited };
}
