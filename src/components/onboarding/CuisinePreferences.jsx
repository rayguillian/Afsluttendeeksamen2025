import React, { useState, useEffect } from 'react';
import styles from './styles/iphone.module.css';

const CuisinePreferences = ({ onNext, isFirst }) => {
  const [cuisines, setCuisines] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCuisines = async () => {
      try {
        const response = await import('./data/initial/cuisines.json');
        setCuisines(response.cuisines);
        setLoading(false);
      } catch (error) {
        console.error('Error loading cuisines:', error);
        setLoading(false);
      }
    };

    loadCuisines();
  }, []);

  const handleCuisineSelect = async (cuisine) => {
    setSelectedCuisine(cuisine);
    try {
      await import(`./data/recipes/by-cuisine/${cuisine.id}.json`);
    } catch (error) {
      console.error(`Error preloading recipes for ${cuisine.name}:`, error);
    }
  };

  const handleNext = () => {
    if (selectedCuisine) {
      // Ensure cuisine object has both id and name properties
      onNext({
        cuisine: {
          id: selectedCuisine.id,
          name: selectedCuisine.name,
          label: selectedCuisine.name // Add label for consistency with other preferences
        }
      });
    }
  };

  if (loading) {
    return (
      <div className={`${styles.iphoneContainer} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Indlæser køkkentyper...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-lg sm:text-xl font-bold">Vælg dine madpræferencer</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Vælg din foretrukne køkkentype</p>
      </div>

      <div className={`${styles.scrollView} space-y-2 px-3 sm:px-4`}>
        {cuisines.map((cuisine) => (
          <button
            key={cuisine.id}
            onClick={() => handleCuisineSelect(cuisine)}
            className={`w-full p-3 rounded-lg border shadow-sm transition-colors flex items-center
              ${selectedCuisine?.id === cuisine.id
                ? 'bg-blue-600 text-white border-transparent'
                : 'bg-white border-gray-200 hover:border-blue-600'}`}
          >
            <span className="text-lg mr-2">{cuisine.flag}</span>
            <div className="flex flex-col items-start flex-1">
              <span className={`text-sm font-medium ${
                selectedCuisine?.id === cuisine.id ? 'text-white' : ''
              }`}>
                {cuisine.name}
              </span>
              <span className={`text-xs ${
                selectedCuisine?.id === cuisine.id ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {cuisine.popularDishes.join(' • ')}
              </span>
            </div>
            {selectedCuisine?.id === cuisine.id && (
              <svg className="ml-auto w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>
        ))}
        
        <div className={styles.button}>
          <button
            onClick={handleNext}
            disabled={!selectedCuisine}
            className={`w-full h-full rounded-lg font-medium text-sm transition-colors flex items-center justify-center
              ${selectedCuisine
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            <span className="text-xs sm:text-sm">Næste</span>
            <svg className="ml-2 w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CuisinePreferences;
