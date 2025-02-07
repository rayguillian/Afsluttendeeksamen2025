// Price optimization utility

/**
 * Calculate total savings for a recipe
 * @param {Object} recipe - Recipe data
 * @returns {Object} Savings information
 */
export const calculateRecipeSavings = (recipe) => {
  const totalRegular = recipe.price.total.regular;
  const totalDiscount = recipe.price.total.discount;
  const savings = totalRegular - totalDiscount;
  const savingsPercent = Math.round((savings / totalRegular) * 100);

  return {
    amount: savings,
    percentage: savingsPercent,
    perServing: savings / recipe.servings
  };
};

/**
 * Find best prices for ingredients across stores
 * @param {Array} ingredients - Recipe ingredients
 * @param {Array} stores - Available stores
 * @returns {Object} Optimized prices and store selection
 */
export const findBestPrices = (ingredients, stores) => {
  const optimizedPrices = ingredients.map(ingredient => {
    // Find all stores that have this ingredient
    const availableStores = stores.filter(store => 
      ingredient.prices.some(price => price.store === store.chain)
    );

    // Find best price for this ingredient
    const bestPrice = ingredient.prices.reduce((best, current) => {
      if (!best || current.discount < best.discount) {
        return current;
      }
      return best;
    }, null);

    // Find store details
    const store = stores.find(s => s.chain === bestPrice.store);

    return {
      ingredient: ingredient.name,
      store: store.name,
      regular: bestPrice.regular,
      discount: bestPrice.discount,
      savings: bestPrice.regular - bestPrice.discount,
      savingsPercent: bestPrice.discountPercentage
    };
  });

  // Calculate totals
  const totals = optimizedPrices.reduce((acc, item) => ({
    regular: acc.regular + item.regular,
    discount: acc.discount + item.discount,
    savings: acc.savings + item.savings
  }), { regular: 0, discount: 0, savings: 0 });

  // Group by store
  const byStore = optimizedPrices.reduce((acc, item) => {
    if (!acc[item.store]) {
      acc[item.store] = {
        items: [],
        total: { regular: 0, discount: 0, savings: 0 }
      };
    }
    acc[item.store].items.push(item);
    acc[item.store].total.regular += item.regular;
    acc[item.store].total.discount += item.discount;
    acc[item.store].total.savings += item.savings;
    return acc;
  }, {});

  return {
    byIngredient: optimizedPrices,
    byStore,
    totals
  };
};

/**
 * Calculate price ranges for recipe categories
 * @param {string} category - Recipe category
 * @returns {Object} Price ranges
 */
export const getPriceRanges = (category) => {
  const ranges = {
    'Kød og Fjerkræ': {
      budget: { min: 30, max: 80 },
      regular: { min: 60, max: 120 },
      premium: { min: 100, max: 200 }
    },
    'Grøntsager og Frugt': {
      budget: { min: 5, max: 25 },
      regular: { min: 15, max: 40 },
      premium: { min: 30, max: 60 }
    },
    'Mejeri og Æg': {
      budget: { min: 10, max: 30 },
      regular: { min: 20, max: 50 },
      premium: { min: 40, max: 80 }
    },
    'Kolonial': {
      budget: { min: 10, max: 40 },
      regular: { min: 30, max: 70 },
      premium: { min: 50, max: 100 }
    },
    'Krydderier': {
      budget: { min: 5, max: 20 },
      regular: { min: 15, max: 40 },
      premium: { min: 30, max: 60 }
    },
    'Korn og Pasta': {
      budget: { min: 8, max: 25 },
      regular: { min: 20, max: 45 },
      premium: { min: 35, max: 70 }
    }
  };

  return ranges[category] || ranges['Kolonial'];
};

/**
 * Calculate optimal discount percentage
 * @param {number} regularPrice - Regular price
 * @param {string} category - Product category
 * @returns {number} Optimal discount percentage
 */
export const calculateOptimalDiscount = (regularPrice, category) => {
  const ranges = getPriceRanges(category);
  
  // Base discount range is 29-34%
  let baseDiscount = 29;
  
  // Adjust based on price position within category range
  if (regularPrice >= ranges.premium.min) {
    // Higher discounts for premium products
    baseDiscount += Math.min(5, Math.floor((regularPrice - ranges.premium.min) / 20));
  } else if (regularPrice <= ranges.budget.max) {
    // Lower discounts for budget products
    baseDiscount = Math.max(29, 34 - Math.floor((ranges.budget.max - regularPrice) / 10));
  }

  return Math.min(34, baseDiscount);
};

/**
 * Generate time-based special offers
 * @param {Array} stores - Store data
 * @returns {Object} Special offers by store
 */
export const generateSpecialOffers = (stores) => {
  const currentHour = new Date().getHours();
  const isWeekend = [0, 6].includes(new Date().getDay());

  return stores.reduce((acc, store) => {
    // Evening discounts (after 19:00)
    const eveningDiscounts = currentHour >= 19 && store.discountProfile.specialOffers;
    
    // Weekend deals
    const weekendDeals = isWeekend && store.discountProfile.weekendDeals;
    
    acc[store.id] = {
      hasSpecialOffers: eveningDiscounts || weekendDeals,
      maxDiscount: store.discountProfile.maxDiscount + (eveningDiscounts ? 5 : 0),
      offers: []
    };

    if (eveningDiscounts) {
      acc[store.id].offers.push({
        type: 'evening',
        discount: 40,
        description: 'Ekstra aftentilbud: Op til 40% på udvalgte varer'
      });
    }

    if (weekendDeals) {
      acc[store.id].offers.push({
        type: 'weekend',
        discount: 35,
        description: 'Weekendtilbud: Mindst 35% på udvalgte varer'
      });
    }

    return acc;
  }, {});
};

/**
 * Calculate potential savings across stores
 * @param {Array} ingredients - Shopping list ingredients
 * @param {Array} stores - Available stores
 * @returns {Object} Savings potential by store
 */
export const calculateSavingsPotential = (ingredients, stores) => {
  const specialOffers = generateSpecialOffers(stores);
  
  return stores.reduce((acc, store) => {
    const storeIngredients = ingredients.filter(ingredient => 
      ingredient.prices.some(price => price.store === store.chain)
    );

    const regularTotal = storeIngredients.reduce((sum, ingredient) => {
      const price = ingredient.prices.find(p => p.store === store.chain);
      return sum + (price ? price.regular : 0);
    }, 0);

    const discountTotal = storeIngredients.reduce((sum, ingredient) => {
      const price = ingredient.prices.find(p => p.store === store.chain);
      return sum + (price ? price.discount : 0);
    }, 0);

    const savings = regularTotal - discountTotal;
    const savingsPercent = Math.round((savings / regularTotal) * 100);

    acc[store.id] = {
      regularTotal,
      discountTotal,
      savings,
      savingsPercent,
      itemCount: storeIngredients.length,
      specialOffers: specialOffers[store.id]
    };

    return acc;
  }, {});
};
