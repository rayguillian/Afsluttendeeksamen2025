// Analytics and visitor tracking utility

/**
 * Track visitor session
 * @returns {Object} Session data
 */
export const trackSession = () => {
  const session = {
    id: generateSessionId(),
    startTime: new Date().toISOString(),
    userAgent: window.navigator.userAgent,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    language: window.navigator.language,
    referrer: document.referrer
  };

  try {
    // Store session in sessionStorage
    const sessions = JSON.parse(sessionStorage.getItem('kobsmart_sessions') || '[]');
    sessions.push(session);
    sessionStorage.setItem('kobsmart_sessions', JSON.stringify(sessions));

    // Update visitor stats
    updateVisitorStats(session);
  } catch (error) {
    console.error('Error tracking session:', error);
  }

  return session;
};

/**
 * Generate unique session ID
 * @returns {string} Session ID
 */
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

/**
 * Update visitor statistics
 * @param {Object} session - Session data
 */
const updateVisitorStats = (session) => {
  try {
    const stats = JSON.parse(sessionStorage.getItem('kobsmart_visitor_stats') || '{}');
    const today = new Date().toDateString();

    // Initialize stats if needed
    if (!stats.dailyVisits) {
      stats.dailyVisits = {};
    }
    if (!stats.dailyVisits[today]) {
      stats.dailyVisits[today] = 0;
    }
    if (!stats.totalVisits) {
      stats.totalVisits = 0;
    }

    // Update counts
    stats.dailyVisits[today]++;
    stats.totalVisits++;
    stats.lastVisit = session.startTime;

    sessionStorage.setItem('kobsmart_visitor_stats', JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating visitor stats:', error);
  }
};

/**
 * Track onboarding flow progress
 * @param {string} step - Current step name
 * @param {Object} data - Step data
 */
export const trackFlowProgress = (step, data) => {
  try {
    const progress = JSON.parse(sessionStorage.getItem('kobsmart_flow_progress') || '[]');
    
    progress.push({
      step,
      timestamp: new Date().toISOString(),
      data
    });

    sessionStorage.setItem('kobsmart_flow_progress', JSON.stringify(progress));
  } catch (error) {
    console.error('Error tracking flow progress:', error);
  }
};

/**
 * Track recipe selection
 * @param {Object} recipe - Selected recipe
 * @param {Object} preferences - User preferences
 */
export const trackRecipeSelection = (recipe, preferences) => {
  try {
    const selections = JSON.parse(sessionStorage.getItem('kobsmart_recipe_selections') || '[]');
    
    selections.push({
      recipeId: recipe.id,
      cuisine: recipe.cuisine,
      timestamp: new Date().toISOString(),
      preferences,
      prepTime: recipe.prepTime,
      price: recipe.price
    });

    sessionStorage.setItem('kobsmart_recipe_selections', JSON.stringify(selections));
  } catch (error) {
    console.error('Error tracking recipe selection:', error);
  }
};

/**
 * Track shopping route generation
 * @param {Object} route - Generated route
 * @param {Object} savings - Savings information
 */
export const trackRouteGeneration = (route, savings) => {
  try {
    const routes = JSON.parse(sessionStorage.getItem('kobsmart_routes') || '[]');
    
    routes.push({
      timestamp: new Date().toISOString(),
      storeCount: route.instructions.length,
      totalDistance: route.summary.totalDistance,
      totalTime: route.summary.totalTime,
      savings
    });

    sessionStorage.setItem('kobsmart_routes', JSON.stringify(routes));
  } catch (error) {
    console.error('Error tracking route generation:', error);
  }
};

/**
 * Get visitor statistics
 * @returns {Object} Visitor statistics
 */
export const getVisitorStats = () => {
  try {
    return JSON.parse(sessionStorage.getItem('kobsmart_visitor_stats') || '{}');
  } catch (error) {
    console.error('Error getting visitor stats:', error);
    return {};
  }
};

/**
 * Get flow completion rate
 * @returns {Object} Completion rate statistics
 */
export const getCompletionRate = () => {
  try {
    const progress = JSON.parse(sessionStorage.getItem('kobsmart_flow_progress') || '[]');
    const sessions = JSON.parse(sessionStorage.getItem('kobsmart_sessions') || '[]');
    
    const completedFlows = progress.filter(p => p.step === 'completed').length;
    const totalSessions = sessions.length;

    return {
      completedFlows,
      totalSessions,
      rate: totalSessions > 0 ? (completedFlows / totalSessions) * 100 : 0
    };
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return {
      completedFlows: 0,
      totalSessions: 0,
      rate: 0
    };
  }
};

/**
 * Get popular recipes
 * @returns {Array} Popular recipes sorted by selection count
 */
export const getPopularRecipes = () => {
  try {
    const selections = JSON.parse(sessionStorage.getItem('kobsmart_recipe_selections') || '[]');
    
    const recipeCount = selections.reduce((acc, selection) => {
      acc[selection.recipeId] = (acc[selection.recipeId] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(recipeCount)
      .map(([recipeId, count]) => ({ recipeId, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error getting popular recipes:', error);
    return [];
  }
};

/**
 * Get average savings
 * @returns {Object} Average savings statistics
 */
export const getAverageSavings = () => {
  try {
    const routes = JSON.parse(sessionStorage.getItem('kobsmart_routes') || '[]');
    
    if (routes.length === 0) {
      return {
        averageSavings: 0,
        totalSavings: 0,
        routeCount: 0
      };
    }

    const totalSavings = routes.reduce((sum, route) => sum + route.savings.amount, 0);
    
    return {
      averageSavings: totalSavings / routes.length,
      totalSavings,
      routeCount: routes.length
    };
  } catch (error) {
    console.error('Error calculating average savings:', error);
    return {
      averageSavings: 0,
      totalSavings: 0,
      routeCount: 0
    };
  }
};
