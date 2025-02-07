// Recipe filtering utility

/**
 * Filter recipes based on user preferences
 * @param {Object} recipes - Recipe data
 * @param {Object} filters - User selected filters
 * @returns {Array} Filtered recipes
 */
export const filterRecipes = (recipes, filters) => {
  const {
    cuisine,
    prepTime,
    dietaryPreferences = [],
    allergies = [],
    maxPrice
  } = filters;

  return recipes.filter(recipe => {
    // Filter by cuisine if specified
    if (cuisine && recipe.cuisine !== cuisine) {
      return false;
    }

    // Filter by prep time
    if (prepTime) {
      // Handle both string (legacy) and object (new) formats
      const category = typeof prepTime === 'string' ? prepTime : prepTime.category;
      if (recipe.prepTime.category !== category) {
        return false;
      }
    }

    // Filter by dietary preferences
    if (dietaryPreferences.length > 0) {
      const hasRequiredTags = dietaryPreferences.every(prefId => 
        recipe.dietaryTags.includes(prefId)
      );
      if (!hasRequiredTags) {
        return false;
      }
    }

    // Filter by allergies
    if (allergies.length > 0) {
      const hasAllergens = allergies.some(allergyId => 
        recipe.allergens.includes(allergyId)
      );
      if (hasAllergens) {
        return false;
      }
    }

    // Filter by max price if specified
    if (maxPrice) {
      if (recipe.cost.perServing > maxPrice) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort recipes by various criteria
 * @param {Array} recipes - Filtered recipes
 * @param {String} sortBy - Sorting criteria
 * @returns {Array} Sorted recipes
 */
export const sortRecipes = (recipes, sortBy = 'price') => {
  switch (sortBy) {
    case 'price':
      return [...recipes].sort((a, b) => 
        a.cost.perServing - b.cost.perServing
      );
    case 'time':
      return [...recipes].sort((a, b) => 
        a.prepTime.minutes - b.prepTime.minutes
      );
    case 'rating':
      return [...recipes].sort((a, b) => 
        b.ratings.average - a.ratings.average
      );
    default:
      return recipes;
  }
};

/**
 * Calculate savings for a recipe
 * @param {Object} recipe - Recipe data
 * @returns {Object} Savings information
 */
export const calculateSavings = (recipe) => {
  const { regular, discount } = recipe.price.total;
  const savings = regular - discount;
  const savingsPercentage = Math.round((savings / regular) * 100);

  return {
    amount: savings,
    percentage: savingsPercentage,
    perServing: savings / recipe.servings
  };
};

/**
 * Get best store prices for recipe ingredients
 * @param {Object} recipe - Recipe data
 * @returns {Array} Optimized store selection
 */
export const getBestPrices = (recipe) => {
  return recipe.ingredients.map(ingredient => {
    // Sort prices by discount price
    const bestPrice = ingredient.prices.sort((a, b) => 
      a.discount - b.discount
    )[0];

    return {
      ingredient: ingredient.name,
      store: bestPrice.store,
      price: bestPrice.discount,
      savings: bestPrice.regular - bestPrice.discount
    };
  });
};

/**
 * Check if recipe matches dietary restrictions
 * @param {Object} recipe - Recipe data
 * @param {Object} preferences - User preferences
 * @returns {Boolean} Whether recipe is compatible
 */
export const isRecipeCompatible = (recipe, preferences) => {
  const { dietaryPreferences, allergies } = preferences;

  // Check for incompatible combinations
  const incompatibleCombos = [
    ['vegetar', 'keto'],
    ['veganer', 'keto']
  ];

  for (const [pref1, pref2] of incompatibleCombos) {
    if (dietaryPreferences.includes(pref1) && dietaryPreferences.includes(pref2)) {
      return false;
    }
  }

  // Check if recipe meets all dietary preferences
  const meetsPreferences = dietaryPreferences.every(pref => 
    recipe.dietaryTags.includes(pref)
  );

  // Check if recipe contains any allergens
  const hasAllergens = allergies.some(allergy => 
    recipe.allergens.includes(allergy)
  );

  return meetsPreferences && !hasAllergens;
};

/**
 * Get nutrition compatibility score
 * @param {Object} recipe - Recipe data
 * @param {Object} preferences - User preferences
 * @returns {Number} Compatibility score (0-100)
 */
export const getNutritionScore = (recipe, preferences) => {
  const { nutrition } = recipe;
  let score = 100;

  // Adjust score based on dietary preferences
  if (preferences.includes('lavKulhydrat') && nutrition.carbs > 30) {
    score -= 20;
  }
  if (preferences.includes('keto') && nutrition.carbs > 20) {
    score -= 30;
  }
  if (preferences.includes('keto') && nutrition.fat < 70) {
    score -= 20;
  }

  return Math.max(0, score);
};
