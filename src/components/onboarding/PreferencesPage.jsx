import React, { useState } from 'react';
import styles from './styles/iphone.module.css';

const PreferencesPage = ({ onNext, onBack }) => {
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [selectedAllergies, setSelectedAllergies] = useState([]);

  const preferences = [
    { id: 'vegetar', name: 'Vegetar', icon: '🥗' },
    { id: 'veganer', name: 'Veganer', icon: '🌱' },
    { id: 'pescetær', name: 'Pescetær', icon: '🐟' },
    { id: 'glutenfri', name: 'Glutenfri', icon: '🌾' },
    { id: 'laktosefri', name: 'Laktosefri', icon: '🥛' },
    { id: 'noeddefri', name: 'Nøddefri', icon: '🥜' },
    { id: 'oekologisk', name: 'Økologisk', icon: '🌿' },
    { id: 'lavKulhydrat', name: 'Lavt kulhydratindhold', icon: '🍖' },
    { id: 'keto', name: 'Keto', icon: '🥑' },
    { id: 'halal', name: 'Halal', icon: '🌙' }
  ];

  const allergies = [
    { id: 'gluten', name: 'Gluten', icon: '🌾' },
    { id: 'maelk', name: 'Mælk', icon: '🥛' },
    { id: 'skaldyr', name: 'Skaldyr', icon: '🦐' },
    { id: 'aeg', name: 'Æg', icon: '🥚' },
    { id: 'noedder', name: 'Nødder', icon: '🥜' },
    { id: 'soja', name: 'Soja', icon: '🫘' }
  ];

  const togglePreference = (pref) => {
    setSelectedPreferences(prev => {
      if (prev.find(p => p.id === pref.id)) {
        return prev.filter(p => p.id !== pref.id);
      }
      return [...prev, { id: pref.id, label: pref.name }];
    });
  };

  const toggleAllergy = (allergy) => {
    setSelectedAllergies(prev => {
      if (prev.find(a => a.id === allergy.id)) {
        return prev.filter(a => a.id !== allergy.id);
      }
      return [...prev, { id: allergy.id, label: allergy.name }];
    });
  };

  const handleNext = () => {
    onNext({
      preferences: selectedPreferences,
      allergies: selectedAllergies
    });
  };

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-lg sm:text-xl font-bold">Kostpræferencer</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Vælg dine kostpræferencer og allergier</p>
      </div>

      <div className={`${styles.scrollView} px-3 sm:px-4`}>
        <div className={styles.subheading}>Kostpræferencer</div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {preferences.map((pref) => (
            <button
              key={pref.id}
              onClick={() => togglePreference(pref)}
              className={`p-2 sm:p-3 rounded-lg border transition-colors flex items-center
                ${selectedPreferences.find(p => p.id === pref.id)
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'bg-white border-gray-200 hover:border-blue-600'}`}
            >
              <span className="text-base sm:text-lg mr-2">{pref.icon}</span>
              <span className="text-xs sm:text-sm font-medium">{pref.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.subheading}>Allergier</div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {allergies.map((allergy) => (
            <button
              key={allergy.id}
              onClick={() => toggleAllergy(allergy)}
              className={`p-2 sm:p-3 rounded-lg border transition-colors flex items-center
                ${selectedAllergies.find(a => a.id === allergy.id)
                  ? 'bg-red-600 text-white border-transparent'
                  : 'bg-white border-gray-200 hover:border-red-600'}`}
            >
              <span className="text-base sm:text-lg mr-2">{allergy.icon}</span>
              <span className="text-xs sm:text-sm font-medium">{allergy.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.button}>
          <div className="h-full flex space-x-3">
            <button
              onClick={onBack}
              className="flex-1 h-full rounded-lg font-medium text-xs sm:text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Tilbage
            </button>
            <button
              onClick={handleNext}
              className="flex-1 h-full rounded-lg font-medium text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Næste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
