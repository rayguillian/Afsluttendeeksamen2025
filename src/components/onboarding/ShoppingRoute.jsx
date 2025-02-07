import React, { useState } from 'react';
import styles from './styles/iphone.module.css';

const ShoppingRoute = ({ recipe, ingredients, onNext, onBack }) => {
  const [highlightSavings] = useState(true);

  // Split ingredients between three stores
  const splitIngredients = (ingredients) => {
    const third = Math.ceil(ingredients.length / 3);
    
    const stores = [
      {
        name: 'Rema 1000',
        distance: '0.5 km',
        stopLabel: 'Første stop',
        items: ingredients.slice(0, third).map(item => ({
          name: item.name,
          weight: item.weight || '',
          discountPrice: item.discountPrice,
          price: item.price,
          percentOff: Math.round(((item.price - item.discountPrice) / item.price) * 100)
        }))
      },
      {
        name: 'Føtex',
        distance: '1.2 km',
        stopLabel: 'Andet stop',
        items: ingredients.slice(third, third * 2).map(item => ({
          name: item.name,
          weight: item.weight || '',
          discountPrice: item.discountPrice,
          price: item.price,
          percentOff: Math.round(((item.price - item.discountPrice) / item.price) * 100)
        }))
      },
      {
        name: 'Netto',
        distance: '0.8 km',
        stopLabel: 'Tredje stop',
        items: ingredients.slice(third * 2).map(item => ({
          name: item.name,
          weight: item.weight || '',
          discountPrice: item.discountPrice,
          price: item.price,
          percentOff: Math.round(((item.price - item.discountPrice) / item.price) * 100)
        }))
      }
    ];

    return stores.filter(store => store.items.length > 0);
  };

  const stops = splitIngredients(ingredients);

  const totalCost = stops.reduce((acc, stop) => 
    acc + stop.items.reduce((itemAcc, item) => 
      itemAcc + item.discountPrice, 0), 0
  );

  // Calculate savings based on percentages
  const totalSavings = stops.reduce((acc, stop) => 
    acc + stop.items.reduce((itemAcc, item) => 
      itemAcc + (item.discountPrice * item.percentOff / (100 - item.percentOff)), 0), 0
  );

  const savingsPercent = Math.round((totalSavings / (totalCost + totalSavings)) * 100);

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-lg sm:text-xl font-bold">Indkøbsrute</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Optimeret rute til {stops.length} butikker
        </p>
      </div>

      <div className={`${styles.scrollView} px-3 sm:px-4`}>
        {highlightSavings && (
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-200 shadow-sm">
            <div className="text-center mb-2">
              <span className="text-emerald-900 text-lg">Du sparer i alt</span>
            </div>
            <div className="text-center text-3xl font-bold text-emerald-600 mb-1">
              {Math.round(totalSavings)} kr
            </div>
            <div className="text-center text-emerald-900 font-medium">
              {savingsPercent}% rabat på hele kurven
            </div>
          </div>
        )}

        <div className="space-y-4 mb-4">
          {stops.map((stop, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center mb-3">
                <svg className="text-blue-600 w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold">{stop.name}</h2>
                  <p className="text-gray-500 text-sm">{stop.distance}</p>
                </div>
                <span className="text-gray-500 text-sm">{stop.stopLabel}</span>
              </div>

              {stop.items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 mb-2 last:mb-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-bl-lg">
                    -{item.percentOff}%
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-gray-500 text-xs">{item.weight}</p>
                    </div>
                    <div className="text-right flex items-center mt-2">
                      <p className="font-bold text-sm">{item.discountPrice} kr</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="bg-blue-600 rounded-xl p-4 shadow-sm text-white mb-4">
          <div className="flex justify-between items-center mb-1">
            <span>Normalpris:</span>
            <span className="text-lg line-through opacity-80">{Math.round(totalCost + totalSavings)} kr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg">Din pris:</span>
            <span className="text-3xl font-bold">{totalCost} kr</span>
          </div>
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
              onClick={() => onNext({ stops, totalSavings, totalCost })}
              className="flex-1 h-full rounded-lg font-medium text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Se kort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingRoute;
