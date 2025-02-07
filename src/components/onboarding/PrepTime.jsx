import React, { useState } from 'react';
import styles from './styles/iphone.module.css';

const PrepTime = ({ onNext, onBack }) => {
  const [selectedTime, setSelectedTime] = useState(null);

  const timeOptions = [
    {
      id: 'hurtig',
      name: 'Hurtig',
      description: '10-30 minutter',
      icon: '⚡️',
      details: 'Perfekt til travle hverdage',
      minutes: 30,
      category: 'hurtig'
    },
    {
      id: 'normal',
      name: 'Normal',
      description: '45 min - 1 time',
      icon: '⏰',
      details: 'Standard tilberedningstid',
      minutes: 60,
      category: 'normal'
    },
    {
      id: 'langsom',
      name: 'Langsom',
      description: '1-3 timer',
      icon: '🍳',
      details: 'Til de særlige måltider',
      minutes: 120,
      category: 'langsom'
    }
  ];

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    if (selectedTime) {
      // Ensure prepTime object has all required properties
      onNext({
        prepTime: {
          id: selectedTime.id,
          category: selectedTime.category,
          minutes: selectedTime.minutes,
          label: selectedTime.name // Add label for consistency with other preferences
        }
      });
    }
  };

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-lg sm:text-xl font-bold">Tilberedningstid</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Hvor lang tid vil du bruge på madlavning?</p>
      </div>

      <div className={`${styles.scrollView} px-3 sm:px-4 space-y-3`}>
        {timeOptions.map((time) => (
          <button
            key={time.id}
            onClick={() => handleTimeSelect(time)}
            className={`w-full p-3 sm:p-4 rounded-lg border transition-colors flex items-start
              ${selectedTime?.id === time.id
                ? 'bg-blue-600 text-white border-transparent'
                : 'bg-white border-gray-200 hover:border-blue-600'}`}
          >
            <span className="text-xl sm:text-2xl mr-3 mt-1">{time.icon}</span>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium">{time.name}</span>
                <span className={`text-xs sm:text-sm ${
                  selectedTime?.id === time.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {time.description}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${
                selectedTime?.id === time.id ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {time.details}
              </p>
            </div>
          </button>
        ))}

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
              disabled={!selectedTime}
              className={`flex-1 h-full rounded-lg font-medium text-xs sm:text-sm transition-colors
                ${selectedTime
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Næste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrepTime;
