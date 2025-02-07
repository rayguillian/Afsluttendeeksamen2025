# KobSmart Project Roadmap

## 1. Project Overview

### Purpose
- Create a convincing mock shopping app with recipe suggestions and optimized shopping routes
- Implement realistic data flows and user interactions
- Demonstrate full functionality without backend dependencies

### Component Structure
```
src/components/onboarding/
├── CuisinePreferences.jsx    # Cuisine selection
├── PrepTime.jsx              # Cooking time preferences
├── PreferencesPage.jsx       # Dietary restrictions & allergies
├── Recipes.jsx              # Recipe suggestions
├── ShoppingRoute.jsx        # Optimized shopping path
├── ShoppingMapView.jsx      # Interactive map view
└── IPhoneFrame.jsx         # UI container component
```

### Data Flow
1. User selects cuisine preferences
2. Specifies prep time constraints
3. Indicates dietary restrictions
4. Views matched recipes
5. Gets optimized shopping route
6. Follows interactive map guidance

## 2. Implementation Phases

### Phase 1: Mock Data Structure (Days 1-2)
- [ ] Create data/ directory structure
- [ ] Define JSON schemas for all data types
- [ ] Implement base mock data generators
- [ ] Set up data validation utilities

#### Data Categories:
```
data/
├── recipes/
│   ├── by-cuisine/
│   ├── by-preptime/
│   └── by-diet/
├── stores/
│   ├── locations/
│   ├── inventory/
│   └── prices/
└── maps/
    ├── coordinates/
    ├── routes/
    └── districts/
```

### Phase 2: Recipe Generation (Days 2-3)

#### Recipe Requirements:
- [ ] 5-10 recipes per cuisine (45-90 total)
- [ ] Cover all dietary preferences:
  - Vegetar
  - Veganer
  - Pescetær
  - Glutenfri
  - Laktosefri
  - Nøddefri
  - Økologisk
  - Lavt kulhydratindhold
  - Keto
  - Halal

#### Recipe Data Points:
- [ ] Name (Danish)
- [ ] Ingredients list
- [ ] Preparation time
- [ ] Cooking instructions
- [ ] Dietary tags
- [ ] Allergy information
- [ ] Cost estimate
- [ ] Serving size
- [ ] Nutritional info

### Phase 3: Store & Product Data (Days 3-4)

#### Store Coverage:
- [ ] Rema 1000
- [ ] Føtex
- [ ] Netto
- [ ] Lidl
- [ ] Bilka
- [ ] Aldi
- [ ] Meny

#### Store Data Points:
- [ ] Multiple locations per chain
- [ ] Operating hours
- [ ] Product inventory
- [ ] Price data
  - Regular prices
  - Discount prices (29-34% range)
  - Special offers

#### Product Categories:
- [ ] Meat & Poultry
- [ ] Vegetables & Fruits
- [ ] Dairy & Eggs
- [ ] Pantry Items
- [ ] Spices & Seasonings
- [ ] Grains & Pasta

### Phase 4: Map & Route Data (Days 4-5)

#### Map Features:
- [ ] Copenhagen neighborhood coverage
- [ ] Store location coordinates
- [ ] Main roads network
- [ ] Secondary roads
- [ ] Parks and landmarks
- [ ] Building blocks

#### Route Optimization:
- [ ] Walking distance calculations
- [ ] Time estimates
- [ ] Multiple route options
- [ ] Navigation instructions
- [ ] Total distance optimization
- [ ] Savings optimization
- [ ] Product freshness consideration

### Phase 5: Component Integration (Days 5-6)

#### Integration Tasks:
- [ ] Connect CuisinePreferences with recipe data
- [ ] Link PrepTime with filtered recipes
- [ ] Connect PreferencesPage with dietary filters
- [ ] Implement recipe matching logic
- [ ] Connect ShoppingRoute with store data
- [ ] Integrate map visualization
- [ ] Implement shopping list management

## 3. Testing Strategy

### Data Validation
- [ ] Verify recipe coverage across all cuisines
- [ ] Validate dietary restriction combinations
- [ ] Check price consistency across stores
- [ ] Verify route optimization logic

### User Flow Testing
- [ ] Test all navigation paths
- [ ] Verify preference selections
- [ ] Test recipe filtering
- [ ] Validate shopping route generation
- [ ] Check map interaction

### Edge Cases
- [ ] Handle no matching recipes
- [ ] Test extreme dietary restrictions
- [ ] Verify distant store locations
- [ ] Test complex shopping routes

## 4. Future Improvements

### Scalability
- Add more recipes and cuisines
- Expand store coverage
- Implement real-time price updates
- Add seasonal recipe variations

### Performance
- Optimize route calculations
- Implement data caching
- Lazy load map data
- Reduce initial load time

### Features
- Add favorite recipes
- Implement shopping history
- Add price alerts
- Include user reviews
- Add meal planning calendar

## 5. Success Metrics

### User Experience
- Smooth navigation flow
- Realistic data presentation
- Responsive interactions
- Intuitive map interface

### Data Quality
- Comprehensive recipe coverage
- Realistic price variations
- Accurate route calculations
- Consistent dietary filtering

### Visual Appeal
- Professional UI presentation
- Clear map visualization
- Attractive recipe displays
- Intuitive shopping lists
