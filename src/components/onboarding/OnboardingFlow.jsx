import React, { useState } from 'react';
import CuisinePreferences from './CuisinePreferences';
import PrepTime from './PrepTime';
import PreferencesPage from './PreferencesPage';
import Recipes from './Recipes';
import ShoppingRoute from './ShoppingRoute';
import ShoppingMapView from './ShoppingMapView';

const OnboardingFlow = () => {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState({
    cuisine: null,
    prepTime: null,
    dietaryPreferences: [], // Changed from preferences to dietaryPreferences
    allergies: [],
    recipe: null,
    selectedIngredients: [],
    selectedStores: [],
    totalSavings: 0,
    totalCost: 0
  });

  const handleCuisineNext = (data) => {
    setPreferences(prev => ({ ...prev, cuisine: data.cuisine }));
    setStep(1);
  };

  const handlePrepTimeNext = (data) => {
    setPreferences(prev => ({ ...prev, prepTime: data.prepTime }));
    setStep(2);
  };

  const handlePreferencesNext = (data) => {
    setPreferences(prev => ({
      ...prev,
      dietaryPreferences: data.preferences, // Map preferences to dietaryPreferences
      allergies: data.allergies
    }));
    setStep(3);
  };

  const handleRecipeNext = (data) => {
    setPreferences(prev => ({ 
      ...prev, 
      recipe: data.recipe,
      selectedIngredients: data.selectedStore 
    }));
    setStep(4);
  };

  const handleRouteNext = (data) => {
    setPreferences(prev => ({ 
      ...prev, 
      selectedStores: data.stops,
      totalSavings: data.totalSavings,
      totalCost: data.totalCost 
    }));
    setStep(5);
  };

  const handleBack = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    // Handle completion - could trigger analytics or parent callback
    console.log('Onboarding completed', preferences);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <CuisinePreferences
            onNext={handleCuisineNext}
            isFirst={true}
          />
        );
      case 1:
        return (
          <PrepTime
            onNext={handlePrepTimeNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <PreferencesPage
            onNext={handlePreferencesNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Recipes
            preferences={preferences}
            onNext={handleRecipeNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <ShoppingRoute
            recipe={preferences.recipe}
            ingredients={preferences.selectedIngredients}
            onNext={handleRouteNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <ShoppingMapView
            selectedStores={preferences.selectedStores}
            totalSavings={preferences.totalSavings}
            totalCost={preferences.totalCost}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {renderStep()}
    </div>
  );
};

export default OnboardingFlow;
