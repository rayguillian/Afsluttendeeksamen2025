// Map visualization utility

/**
 * Convert coordinates to SVG viewport coordinates
 * @param {Object} coord - Lat/lng coordinates
 * @param {Object} bounds - Map bounds
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {Object} SVG coordinates
 */
export const coordsToSVG = (coord, bounds, viewport) => {
  const { lat, lng } = coord;
  const { north, south, east, west } = bounds;
  const { width, height } = viewport;

  const x = ((lng - west) / (east - west)) * width;
  const y = ((north - lat) / (north - south)) * height;

  return { x, y };
};

/**
 * Generate SVG path for route
 * @param {Array} points - Array of coordinates
 * @param {Object} bounds - Map bounds
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {string} SVG path string
 */
export const generateRoutePath = (points, bounds, viewport) => {
  if (points.length < 2) return '';

  const coords = points.map(point => coordsToSVG(point, bounds, viewport));
  
  return coords.reduce((path, coord, i) => {
    const command = i === 0 ? 'M' : 'L';
    return `${path} ${command} ${coord.x},${coord.y}`;
  }, '');
};

/**
 * Generate map features (roads, parks, etc.)
 * @param {Object} district - District data
 * @param {Object} bounds - Map bounds
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {Object} SVG elements for map features
 */
export const generateMapFeatures = (district, bounds, viewport) => {
  const features = {
    roads: [],
    parks: [],
    landmarks: [],
    buildings: []
  };

  district.features.forEach(feature => {
    switch (feature.type) {
      case 'mainRoad':
      case 'secondaryRoad':
        const roadCoords = feature.coordinates.map(coord => 
          coordsToSVG(coord, bounds, viewport)
        );
        features.roads.push({
          type: feature.type,
          path: generateRoutePath(feature.coordinates, bounds, viewport),
          name: feature.name,
          style: feature.type === 'mainRoad' 
            ? { stroke: '#cbd5e1', strokeWidth: 20 }
            : { stroke: '#e2e8f0', strokeWidth: 10 }
        });
        break;

      case 'park':
        const parkCoords = feature.coordinates.map(coord =>
          coordsToSVG(coord, bounds, viewport)
        );
        features.parks.push({
          path: generateRoutePath(feature.coordinates, bounds, viewport),
          name: feature.name,
          style: { fill: '#e2e8f0' }
        });
        break;

      case 'landmark':
        const landmarkCoord = coordsToSVG(feature.coordinates, bounds, viewport);
        features.landmarks.push({
          ...landmarkCoord,
          name: feature.name,
          style: { fill: '#94a3b8' }
        });
        break;

      case 'building':
        const buildingCoord = coordsToSVG(feature.coordinates, bounds, viewport);
        features.buildings.push({
          ...buildingCoord,
          name: feature.name,
          style: { fill: '#f1f5f9' }
        });
        break;
    }
  });

  return features;
};

/**
 * Generate store markers
 * @param {Array} stores - Store data
 * @param {Object} bounds - Map bounds
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {Array} Store marker elements
 */
export const generateStoreMarkers = (stores, bounds, viewport) => {
  return stores.map(store => {
    const coord = coordsToSVG(store.location.coordinates, bounds, viewport);
    return {
      ...coord,
      id: store.id,
      name: store.name,
      style: {
        marker: { fill: '#3B82F6' },
        text: { fill: '#1e40af', fontSize: 12 }
      }
    };
  });
};

/**
 * Generate route visualization
 * @param {Object} route - Route data
 * @param {Object} bounds - Map bounds
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {Object} Route visualization elements
 */
export const generateRouteVisualization = (route, bounds, viewport) => {
  const stops = route.instructions.map(stop => stop.coordinates);
  
  return {
    path: {
      main: generateRoutePath(stops, bounds, viewport),
      style: {
        stroke: '#3B82F6',
        strokeWidth: 3,
        fill: 'none',
        strokeDasharray: '8 8'
      }
    },
    glow: {
      path: generateRoutePath(stops, bounds, viewport),
      style: {
        stroke: '#93c5fd',
        strokeWidth: 6,
        fill: 'none'
      }
    },
    markers: route.instructions.map((stop, index) => {
      const coord = coordsToSVG(stop.coordinates, bounds, viewport);
      return {
        ...coord,
        order: index + 1,
        name: stop.store,
        style: {
          marker: { fill: index === 0 ? '#3B82F6' : '#94A3B8' },
          text: { fill: '#1e40af', fontSize: 12 }
        }
      };
    })
  };
};

/**
 * Generate navigation overlay
 * @param {Object} currentStop - Current stop data
 * @param {Object} nextStop - Next stop data
 * @returns {Object} Navigation overlay content
 */
export const generateNavigationOverlay = (currentStop, nextStop) => {
  if (!nextStop) {
    return {
      title: 'Sidste stop',
      subtitle: null,
      icon: 'checkmark'
    };
  }

  return {
    title: `Næste stop: ${nextStop.store}`,
    subtitle: `${nextStop.distance} km • ${nextStop.time} min at gå`,
    icon: 'navigation'
  };
};

/**
 * Calculate map bounds for given coordinates
 * @param {Array} coordinates - Array of coordinates
 * @param {number} padding - Padding percentage
 * @returns {Object} Map bounds
 */
export const calculateMapBounds = (coordinates, padding = 0.1) => {
  const lats = coordinates.map(coord => coord.lat);
  const lngs = coordinates.map(coord => coord.lng);

  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const east = Math.max(...lngs);
  const west = Math.min(...lngs);

  const latPadding = (north - south) * padding;
  const lngPadding = (east - west) * padding;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding
  };
};

/**
 * Generate compass rose
 * @param {Object} viewport - SVG viewport dimensions
 * @returns {Object} Compass rose elements
 */
export const generateCompassRose = (viewport) => {
  const size = Math.min(viewport.width, viewport.height) * 0.1;
  const x = viewport.width - size - 20;
  const y = size + 20;

  return {
    position: { x, y },
    size,
    elements: {
      circle: {
        style: {
          fill: 'white',
          stroke: '#3B82F6',
          strokeWidth: 1
        }
      },
      arrow: {
        path: `M 0,-${size * 0.8} L ${size * 0.5},${size * 0.5} L 0,${size * 0.25} L -${size * 0.5},${size * 0.5} Z`,
        style: {
          fill: '#3B82F6'
        }
      }
    }
  };
};
