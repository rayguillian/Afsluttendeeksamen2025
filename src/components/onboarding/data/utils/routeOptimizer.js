// Route optimization utility

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate estimated travel time between points
 * @param {number} distance - Distance in kilometers
 * @param {string} mode - Travel mode (walking, cycling, driving)
 * @param {Object} timeFactors - Time-based multipliers
 * @returns {number} Time in minutes
 */
const calculateTravelTime = (distance, mode, timeFactors) => {
  const speeds = {
    walking: 5,
    cycling: 15,
    driving: 30
  };

  const baseTime = (distance / speeds[mode]) * 60;
  const timeMultiplier = timeFactors.current;
  return Math.round(baseTime * timeMultiplier);
};

/**
 * Find best stores for a shopping list based on prices and location
 * @param {Array} shoppingList - List of items to buy
 * @param {Array} stores - Available stores
 * @param {Object} userLocation - User's coordinates
 * @returns {Array} Optimized store sequence
 */
export const findBestStores = (shoppingList, stores, userLocation) => {
  // Group items by category for efficient shopping
  const categorizedItems = shoppingList.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Calculate potential savings and travel costs for each store
  const storeScores = stores.map(store => {
    const distance = calculateDistance(userLocation, store.location.coordinates);
    let totalSavings = 0;
    let itemsAvailable = 0;

    Object.values(categorizedItems).flat().forEach(item => {
      const storePrice = item.prices.find(p => p.store === store.chain);
      if (storePrice) {
        totalSavings += (storePrice.regular - storePrice.discount);
        itemsAvailable++;
      }
    });

    // Score based on savings per km traveled
    const score = totalSavings / (distance + 1); // Add 1 to avoid division by zero
    
    return {
      store,
      score,
      distance,
      itemsAvailable,
      totalSavings
    };
  });

  // Sort stores by score and select the best combination
  return optimizeStoreSequence(storeScores, userLocation);
};

/**
 * Optimize the sequence of stores to visit
 * @param {Array} storeScores - Scored stores
 * @param {Object} userLocation - User's coordinates
 * @returns {Array} Optimized sequence
 */
const optimizeStoreSequence = (storeScores, userLocation) => {
  const sequence = [];
  let currentLocation = userLocation;
  let remainingStores = [...storeScores];

  while (remainingStores.length > 0) {
    // Find next best store based on distance and savings
    const nextStoreIndex = remainingStores.reduce((bestIdx, store, currentIdx) => {
      const distance = calculateDistance(currentLocation, store.store.location.coordinates);
      const score = store.totalSavings / (distance + 1);
      
      if (score > remainingStores[bestIdx].totalSavings / 
          (calculateDistance(currentLocation, remainingStores[bestIdx].store.location.coordinates) + 1)) {
        return currentIdx;
      }
      return bestIdx;
    }, 0);

    const nextStore = remainingStores[nextStoreIndex];
    sequence.push(nextStore);
    currentLocation = nextStore.store.location.coordinates;
    remainingStores.splice(nextStoreIndex, 1);
  }

  return sequence;
};

/**
 * Generate route instructions
 * @param {Array} storeSequence - Sequence of stores to visit
 * @param {Object} userLocation - Starting point
 * @returns {Array} Navigation instructions
 */
export const generateRouteInstructions = (storeSequence, userLocation) => {
  const instructions = [];
  let currentLocation = userLocation;
  let totalDistance = 0;
  let totalSavings = 0;

  storeSequence.forEach((store, index) => {
    const distance = calculateDistance(currentLocation, store.store.location.coordinates);
    totalDistance += distance;
    totalSavings += store.totalSavings;

    instructions.push({
      step: index + 1,
      store: store.store.name,
      distance: Math.round(distance * 100) / 100,
      time: calculateTravelTime(distance, 'walking', { current: 1 }),
      savings: Math.round(store.totalSavings),
      address: store.store.location.address,
      coordinates: store.store.location.coordinates
    });

    currentLocation = store.store.location.coordinates;
  });

  return {
    instructions,
    summary: {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalSavings,
      totalTime: instructions.reduce((sum, inst) => sum + inst.time, 0),
      storeCount: instructions.length
    }
  };
};

/**
 * Calculate optimal shopping times
 * @param {Array} storeSequence - Sequence of stores
 * @returns {Object} Recommended shopping times
 */
export const calculateShoppingTimes = (storeSequence) => {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = [0, 6].includes(now.getDay());

  // Define quiet hours for shopping
  const quietHours = {
    weekday: [
      { start: 10, end: 12 }, // Late morning
      { start: 14, end: 16 }, // Afternoon
      { start: 19, end: 21 }  // Evening
    ],
    weekend: [
      { start: 9, end: 11 },  // Early morning
      { start: 13, end: 15 }, // Early afternoon
      { start: 18, end: 20 }  // Evening
    ]
  };

  const periods = isWeekend ? quietHours.weekend : quietHours.weekday;
  
  // Find next available quiet period
  const nextPeriod = periods.find(period => period.start > hour) || periods[0];

  return {
    recommendedTime: nextPeriod,
    estimatedDuration: Math.ceil(storeSequence.length * 30), // 30 min per store
    trafficMultiplier: isWeekend ? 1.1 : 1.3
  };
};
