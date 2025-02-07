import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, Circle, ChevronRight, ChevronLeft } from 'lucide-react';
import styles from './styles/iphone.module.css';

const ShoppingMapView = ({ onBack, onNext, selectedStores, totalSavings, totalCost }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const toggleItem = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const MapMockup = () => (
    <div className="relative w-full h-full bg-gray-100 rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-blue-50">
        {/* Simple map mockup with route */}
        <svg className="w-full h-full" viewBox="0 0 400 600">
          {/* Map base color */}
          <rect width="100%" height="100%" fill="#f8fafc" />
          
          {/* Parks and green areas */}
          <path d="M 50,100 Q 100,80 150,100 Q 200,120 250,100 L 250,150 Q 200,170 150,150 Q 100,130 50,150 Z" 
                fill="#e2e8f0" />
          <path d="M 300,400 Q 350,380 380,400 L 380,450 Q 350,470 300,450 Z" 
                fill="#e2e8f0" />
          
          {/* Main roads */}
          <path d="M 0,150 L 400,150" stroke="#cbd5e1" strokeWidth="20" />
          <path d="M 0,300 L 400,300" stroke="#cbd5e1" strokeWidth="20" />
          <path d="M 200,0 L 200,600" stroke="#cbd5e1" strokeWidth="20" />
          
          {/* Secondary roads */}
          <path d="M 100,0 L 100,600" stroke="#e2e8f0" strokeWidth="10" />
          <path d="M 300,0 L 300,600" stroke="#e2e8f0" strokeWidth="10" />
          <path d="M 0,450 L 400,450" stroke="#e2e8f0" strokeWidth="10" />
          
          {/* Building blocks */}
          <g fill="#f1f5f9">
            <rect x="20" y="20" width="60" height="60" />
            <rect x="220" y="180" width="40" height="80" />
            <rect x="320" y="220" width="60" height="60" />
            <rect x="120" y="320" width="50" height="50" />
            <rect x="270" y="480" width="40" height="90" />
          </g>
          
          {/* Route path with glow effect */}
          <path 
            d="M 150,150 L 200,250 L 180,400 L 220,500" 
            stroke="#93c5fd"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M 150,150 L 200,250 L 180,400 L 220,500" 
            stroke="#3B82F6" 
            strokeWidth="3" 
            fill="none" 
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 8"
          />
          
          {/* Store locations with labels */}
          <g>
            <circle cx="150" cy="150" r="12" fill="#3B82F6" />
            <circle cx="150" cy="150" r="8" fill="white" />
            <text x="170" y="145" fill="#1e40af" fontSize="12" fontWeight="bold">Rema 1000</text>
          </g>
          <g>
            <circle cx="200" cy="250" r="12" fill="#3B82F6" />
            <circle cx="200" cy="250" r="8" fill="white" />
            <text x="220" y="245" fill="#1e40af" fontSize="12" fontWeight="bold">Føtex</text>
          </g>
          <g>
            <circle cx="180" cy="400" r="12" fill="#3B82F6" />
            <circle cx="180" cy="400" r="8" fill="white" />
            <text x="200" y="395" fill="#1e40af" fontSize="12" fontWeight="bold">Netto</text>
          </g>
          
          {/* Current location pulse effect */}
          <circle cx="150" cy="150" r="20" fill="#3B82F6" fillOpacity="0.2">
            <animate 
              attributeName="r" 
              values="15;25;15" 
              dur="2s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="fill-opacity" 
              values="0.3;0.1;0.3" 
              dur="2s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          {/* Compass rose */}
          <g transform="translate(340, 50)">
            <circle cx="0" cy="0" r="15" fill="white" stroke="#3B82F6" strokeWidth="1" />
            <path d="M 0,-12 L 8,8 L 0,4 L -8,8 Z" fill="#3B82F6" />
          </g>
        </svg>
        
        {/* Navigation overlay */}
        <div className="absolute top-4 left-4 right-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <Navigation className="text-blue-600 w-5 h-5 mr-2" />
            <div>
              <p className="font-medium">Næste stop: {selectedStores[1]?.name || 'Føtex'}</p>
              <p className="text-sm text-gray-500">{selectedStores[1]?.distance || '1.2 km'} • 15 min at gå</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.iphoneContainer}>
      <div className={styles.heading}>
        <h1 className="text-lg sm:text-xl font-bold">Din indkøbsrute</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Optimeret rute til dine ingredienser
        </p>
      </div>

      <div className="px-3 sm:px-4">
        <div className="relative h-[500px] bg-white rounded-xl overflow-hidden">
          {/* Map view - full width/height */}
          <div className="absolute inset-0">
            <MapMockup />
          </div>
          
          {/* Shopping list overlay */}
          <div 
            className={`absolute top-0 h-full transform transition-transform duration-300 ${
              isPanelOpen ? 'translate-x-0' : '-translate-x-[250px]'
            }`}
          >
            <div className="relative w-[250px] h-full bg-white/95 backdrop-blur-sm shadow-xl">
              <div className="absolute inset-0 overflow-y-auto">
                <div className="p-3">
                  <div className="space-y-4">
                    {selectedStores.map((store, storeIdx) => {
                      const allChecked = store.items.every(item => checkedItems[item.id || item.name]);
                      const [isCollapsed, setIsCollapsed] = useState(allChecked);

                      React.useEffect(() => {
                        if (allChecked) {
                          setIsCollapsed(true);
                        }
                      }, [allChecked]);

                      return (
                        <div key={storeIdx}>
                          <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex items-center">
                              <MapPin className={`w-4 h-4 mr-2 ${allChecked ? 'text-gray-400' : 'text-blue-600'}`} />
                              <div>
                                <h2 className={`text-sm font-semibold ${allChecked ? 'line-through text-gray-400' : ''}`}>
                                  {store.name}
                                </h2>
                                <p className="text-xs text-gray-500">{store.distance}</p>
                              </div>
                            </div>
                            <svg 
                              className={`w-4 h-4 text-gray-500 transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                      
                          <div className={`space-y-1 mt-1 ${isCollapsed ? 'hidden' : ''}`}>
                            {store.items.map((item) => (
                              <button
                                key={item.id || item.name}
                                onClick={() => toggleItem(item.id || item.name)}
                                className="w-full flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                {checkedItems[item.id || item.name] ? 
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 mr-2" /> :
                                  <Circle className="w-4 h-4 text-gray-300 mr-2" />
                                }
                                <div className="text-left flex-1">
                                  <p className={`text-sm ${checkedItems[item.id || item.name] ? 'line-through text-gray-400' : ''}`}>
                                    {item.name}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{item.weight}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-red-500 line-through">{item.price}kr</span>
                                      <span className="text-xs font-medium">{item.discountPrice}kr</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Toggle handle */}
              <button 
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 shadow-md"
              >
                {isPanelOpen ? 
                  <ChevronLeft className="w-4 h-4 text-gray-600" /> :
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                }
              </button>
            </div>
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
              onClick={onNext}
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

export default ShoppingMapView;
