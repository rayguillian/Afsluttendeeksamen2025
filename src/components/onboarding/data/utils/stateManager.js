// State management utility for onboarding flow

/**
 * Create a session key for storing state
 * @param {string} key - Base key name
 * @returns {string} Unique session key
 */
const createSessionKey = (key) => `kobsmart_${key}_${new Date().toDateString()}`;

/**
 * Store state in sessionStorage
 * @param {string} key - State key
 * @param {any} value - State value
 */
export const setState = (key, value) => {
  try {
    sessionStorage.setItem(
      createSessionKey(key),
      JSON.stringify(value)
    );
  } catch (error) {
    console.error('Error setting state:', error);
  }
};

/**
 * Retrieve state from sessionStorage
 * @param {string} key - State key
 * @returns {any} Stored state value
 */
export const getState = (key) => {
  try {
    const value = sessionStorage.getItem(createSessionKey(key));
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting state:', error);
    return null;
  }
};

/**
 * Clear all stored state
 */
export const clearState = () => {
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kobsmart_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing state:', error);
  }
};

/**
 * Store user selections throughout onboarding
 * @param {Object} selections - User selections
 */
export const storeSelections = (selections) => {
  const currentSelections = getState('selections') || {};
  setState('selections', {
    ...currentSelections,
    ...selections,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get filtered recipes based on user selections
 * @returns {Array} Filtered recipes
 */
export const getFilteredRecipes = () => {
  const selections = getState('selections');
  if (!selections) return [];

  try {
    const recipes = getState('recipes') || [];
    return recipes.filter(recipe => {
      // Filter by cuisine
      if (selections.cuisine && recipe.cuisine !== selections.cuisine.name) {
        return false;
      }

      // Filter by prep time
      if (selections.prepTime) {
        const { category } = recipe.prepTime;
        if (category !== selections.prepTime.id) {
          return false;
        }
      }

      // Filter by dietary preferences
      if (selections.preferences?.dietary?.length > 0) {
        const hasRequiredTags = selections.preferences.dietary.every(
          pref => recipe.dietaryTags.includes(pref)
        );
        if (!hasRequiredTags) {
          return false;
        }
      }

      // Filter by allergies
      if (selections.preferences?.allergies?.length > 0) {
        const hasAllergens = selections.preferences.allergies.some(
          allergy => recipe.allergens.includes(allergy)
        );
        if (hasAllergens) {
          return false;
        }
      }

      return true;
    });
  } catch (error) {
    console.error('Error filtering recipes:', error);
    return [];
  }
};

/**
 * Track visitor statistics
 */
export const trackVisitor = () => {
  try {
    const visitorStats = getState('visitorStats') || {
      totalVisits: 0,
      lastVisit: null,
      completedFlows: 0
    };

    setState('visitorStats', {
      ...visitorStats,
      totalVisits: visitorStats.totalVisits + 1,
      lastVisit: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking visitor:', error);
  }
};

/**
 * Track completion of onboarding flow
 */
export const trackCompletion = () => {
  try {
    const visitorStats = getState('visitorStats') || {
      totalVisits: 0,
      lastVisit: null,
      completedFlows: 0
    };

    setState('visitorStats', {
      ...visitorStats,
      completedFlows: visitorStats.completedFlows + 1,
      lastCompletion: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking completion:', error);
  }
};

/**
 * Get visitor statistics
 * @returns {Object} Visitor statistics
 */
export const getVisitorStats = () => {
  return getState('visitorStats') || {
    totalVisits: 0,
    lastVisit: null,
    completedFlows: 0
  };
};

/**
 * Store shopping route
 * @param {Object} route - Generated shopping route
 */
export const storeRoute = (route) => {
  setState('currentRoute', {
    ...route,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get current shopping route
 * @returns {Object} Current shopping route
 */
export const getCurrentRoute = () => {
  return getState('currentRoute');
};

/**
 * Reset onboarding flow
 */
export const resetFlow = () => {
  const visitorStats = getState('visitorStats');
  clearState();
  if (visitorStats) {
    setState('visitorStats', visitorStats);
  }
};
