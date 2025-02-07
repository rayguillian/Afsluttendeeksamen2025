import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles/iphone.module.css';

const Recipes = ({ preferences, onNext, onBack }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const calculateSavings = (ingredients) => {
    return ingredients.reduce((acc, curr) => 
      acc + (curr.price - curr.discountPrice), 0
    );
  };

  const calculateTotal = (ingredients) => {
    return ingredients.reduce((acc, curr) => acc + curr.discountPrice, 0);
  };

  const loadRecipes = useCallback(async () => {
    try {
      const { generateMultipleRecipes } = await import('./data/utils/openaiRecipeGenerator.js');
      const generatedRecipes = await generateMultipleRecipes({
        cuisine: preferences.cuisine,
        prepTime: preferences.prepTime,
        dietaryPreferences: preferences.dietaryPreferences || [],
        allergies: preferences.allergies || []
      });
      
      setRecipes(generatedRecipes);
      setLoading(false);
      setRegenerating(false);
    } catch (error) {
      console.error('Error generating recipes:', error);
      setLoading(false);
      setRegenerating(false);
    }
  }, [preferences]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes, attempt]);

  const handleRegenerate = () => {
    setRegenerating(true);
    setAttempt(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className={`${styles.iphoneContainer} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Finder opskrifter...</p>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className={styles.iphoneContainer}>
        <div className={styles.heading}>
          <h1 className="text-lg sm:text-xl font-bold">Ingen opskrifter fundet</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Prøv at justere dine præferencer
          </p>
        </div>
        <div className={`${styles.scrollView} px-3 sm:px-4`}>
          <div className={styles.button}>
            <button
              onClick={onBack}
              className="w-full h-full rounded-lg font-medium text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Tilbage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-2xl font-bold mb-2">Opskrifter til dig</h1>
        <p className="text-gray-500 text-sm">Baseret på {preferences.cuisine.name} køkken og {preferences.prepTime.category} tilberedningstid</p>
      </div>

      <div className={`${styles.scrollView} px-3 sm:px-4 space-y-4`}>
        {recipes.map((recipe, index) => (
          <div key={index} className="bg-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-semibold mb-1">{recipe.name}</h2>
                <span className="text-sm text-gray-500">{recipe.cuisine}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span className="text-sm">{recipe.time}</span>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700">Ingredienser:</h3>
              {recipe.ingredients.map((ingredient, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{ingredient.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 line-through text-xs">{ingredient.price} kr</span>
                    <span className="font-bold">{ingredient.discountPrice} kr</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mb-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Total besparelse:</span>
                <span className="text-emerald-600 font-bold">-{calculateSavings(recipe.ingredients)} kr</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-700">Total pris:</span>
                <span className="font-bold">{calculateTotal(recipe.ingredients)} kr</span>
              </div>
            </div>

            <button 
              onClick={() => onNext({ 
                recipe, 
                selectedStore: recipe.ingredients.map(item => ({
                  ...item,
                  id: Math.random().toString(36).substr(2, 9)
                }))
              })}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              Se indkøbsrute
            </button>
          </div>
        ))}

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className={`w-full p-3 rounded-lg border shadow-sm transition-all duration-200 flex items-center justify-center
            ${regenerating
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-600'}`}
        >
          {regenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
              <span className="text-sm">Finder nye opskrifter...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
              <span className="text-sm">Prøv andre opskrifter</span>
            </>
          )}
        </button>

        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-lg font-medium text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors py-2"
          >
            Tilbage
          </button>
          <button
            onClick={() => onNext({ recipes })}
            className="flex-1 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors py-2"
          >
            Næste
          </button>
        </div>
      </div>
    </div>
  );
};

export default Recipes;
