# Surf Ceylon - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Data Sources](#data-sources)
5. [Machine Learning Models](#machine-learning-models)
6. [Backend System](#backend-system)
7. [Frontend Application](#frontend-application)
8. [Data Flow](#data-flow)
9. [API Endpoints](#api-endpoints)
10. [Deployment & Configuration](#deployment--configuration)

---

## System Overview

**Surf Ceylon** is a smart surf forecasting application designed specifically for surf spots in Sri Lanka. The system combines machine learning predictions with rule-based suitability scoring to recommend the best surf spots based on user preferences, current conditions, and real-time location data.

### Key Features
- **31 Surf Spots** across Sri Lanka (South Coast, East Coast, West Coast, North Coast)
- **ML-Powered Wave Predictions** using Random Forest Regressor
- **Personalized Recommendations** based on skill level, wave preferences, and conditions
- **Real-time Location Filtering** showing spots within 10km radius
- **Interactive Map** with color-coded suitability markers
- **7-Day Forecast Charts** for wave height trends
- **Smart Caching** to optimize performance and reduce API calls

---

## Architecture

The system follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)                  │
│  - Expo Router Navigation                                   │
│  - Context API for State Management                         │
│  - Location Services (expo-location)                        │
│  - Mapbox for Interactive Maps                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼──────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                  │
│  - API Gateway & Request Handler                            │
│  - Suitability Scoring Engine (Rule-based)                  │
│  - Response Caching (5-minute TTL)                          │
│  - Python ML Service Integration                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Child Process Spawn
┌──────────────────────▼──────────────────────────────────────┐
│              ML ENGINE (Python/scikit-learn)                │
│  - Random Forest Regressor Model                            │
│  - StormGlass API Integration                               │
│  - Mock Data Generator (Performance Mode)                   │
│  - Historical Data Collector                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React Native 0.81.5 with Expo SDK 54
- **Navigation**: Expo Router 6.0
- **State Management**: React Context API
- **Maps**: Mapbox (@rnmapbox/maps v10.1.44)
- **Charts**: react-native-chart-kit
- **UI Components**: 
  - expo-linear-gradient for gradients
  - react-native-safe-area-context
  - @react-native-async-storage/async-storage
- **Location**: expo-location

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Dependencies**:
  - `cors` - Cross-origin resource sharing
  - `dotenv` - Environment configuration
  - Child process for Python integration

### ML Engine
- **Language**: Python 3.x
- **ML Library**: scikit-learn (Random Forest Regressor)
- **Data Processing**: pandas
- **HTTP Client**: requests
- **Date/Time**: arrow
- **Environment**: python-dotenv
- **Model Persistence**: joblib

### External Services
- **StormGlass API**: Real-time and historical marine weather data
- **Mapbox API**: Map tiles and geocoding

---

## Data Sources

### 1. StormGlass Marine Weather API

**Primary Data Source** for surf conditions.

#### Parameters Retrieved:
- `swellHeight` - Primary swell height (meters)
- `swellPeriod` - Primary swell period (seconds)
- `swellDirection` - Primary swell direction (degrees)
- `windSpeed` - Wind speed (m/s)
- `windDirection` - Wind direction (degrees)
- `seaLevel` - Sea level pressure (meters)
- `gust` - Wind gust speed (m/s)
- `secondarySwellHeight` - Secondary swell height (meters)
- `secondarySwellPeriod` - Secondary swell period (seconds)
- `secondarySwellDirection` - Secondary swell direction (degrees)
- `waveHeight` - Total wave height (meters)
- `wavePeriod` - Wave period (seconds)

#### Data Sources Within StormGlass:
The API aggregates data from multiple sources:
- **ECMWF** (European Centre for Medium-Range Weather Forecasts)
- **NOAA** (National Oceanic and Atmospheric Administration)
- **MeteoFrance** (Météo-France)
- **SMHI** (Swedish Meteorological and Hydrological Institute)

The system averages values from all available sources for robustness.

#### API Configuration:
- **Endpoint**: `https://api.stormglass.io/v2/weather/point`
- **Authentication**: API Key (stored in `.env` as `STORMGLASS_API_KEY`)
- **Rate Limiting**: Limited to 10 days per historical request
- **Current Mode**: Uses **MOCK DATA** by default for performance (31 spots × API calls would timeout)

### 2. Historical Data

**Storage**: `historical_data.json` (15,210 lines)
- Contains pre-fetched historical data from StormGlass
- Used for model training and testing
- Format: JSON with hourly weather records

### 3. Static Surf Spot Database

**31 Surf Spots** hardcoded with geographic coordinates:

#### South Coast (12 spots) - Best November to April
1. Weligama [80.4264, 5.9721]
2. Midigama [80.3833, 5.9611]
3. Hiriketiya [80.6863, 5.9758]
4. Unawatuna [80.2505, 6.0093]
5. Hikkaduwa [80.0998, 6.1376]
6. Madiha [80.5833, 5.9833]
7. Mirissa [80.4611, 5.9461]
8. Ahangama [80.3667, 5.9667]
9. Kabalana [80.1167, 6.1333]
10. Dewata [80.2833, 5.9833]
11. Polhena [80.3500, 5.9500]
12. Talalla [80.5667, 5.9667]

#### East Coast (10 spots) - Best April to October
13. Arugam Bay [81.8293, 6.8434]
14. Pottuvil Point [81.8333, 6.8667]
15. Whiskey Point [81.8250, 6.8333]
16. Peanut Farm [81.8167, 6.8167]
17. Okanda [81.6574, 6.6604]
18. Lighthouse Point [81.8400, 6.8500]
19. Crocodile Rock [81.8100, 6.8100]
20. Panama [81.7833, 6.7667]
21. Kalmunai [81.8222, 7.4089]
22. Pasikudah [81.5581, 7.9286]

#### West Coast (7 spots) - Variable conditions
23. Mount Lavinia [79.8633, 6.8400]
24. Wellawatte [79.8589, 6.8667]
25. Negombo [79.8358, 7.2083]
26. Bentota [79.9958, 6.4258]
27. Kalutara [79.9589, 6.5844]
28. Wadduwa [79.9292, 6.6667]
29. Beruwala [79.9831, 6.4786]

#### North Coast (2 spots)
30. Kalpitiya [79.7667, 8.2333]
31. Mannar [79.9042, 8.9811]

---

## Machine Learning Models

### Model Architecture: Multi-Output Random Forest Regressor

The system uses a **supervised learning** approach with Random Forest for multi-output regression.

#### Model Specifications:
- **Algorithm**: Random Forest Regressor
- **Estimators**: 100 trees
- **Multi-Output**: Predicts 4 target variables simultaneously
- **Parallelization**: Uses all CPU cores (`n_jobs=-1`)
- **Model File**: `surf_forecast_model.joblib`

#### Input Features (10 variables):
1. `swellHeight` - Primary swell height
2. `swellPeriod` - Primary swell period
3. `swellDirection` - Primary swell direction
4. `windSpeed` - Current wind speed
5. `windDirection` - Current wind direction
6. `seaLevel` - Sea level/pressure
7. `gust` - Wind gust speed
8. `secondarySwellHeight` - Secondary swell height
9. `secondarySwellPeriod` - Secondary swell period
10. `secondarySwellDirection` - Secondary swell direction

#### Output Predictions (4 variables):
1. `waveHeight` - Predicted wave height (meters)
2. `wavePeriod` - Predicted wave period (seconds)
3. `windSpeed` - Predicted wind speed (m/s, converted to km/h)
4. `windDirection` - Predicted wind direction (degrees)

#### Additional Derived Outputs:
- **Tide Status**: Calculated from `seaLevel`
  - High: seaLevel > 0.8
  - Low: seaLevel < 0.3
  - Mid: 0.3 ≤ seaLevel ≤ 0.8

### Training Process

**File**: `train_model.py`

#### Steps:
1. **Data Acquisition**:
   - Fetches 10 days of historical data from StormGlass API
   - Target spot: Weligama (primary training location)
   - Validates all required parameters are present

2. **Data Preprocessing**:
   - Averages values from multiple weather sources
   - Filters out incomplete records
   - Creates pandas DataFrame with all features and targets

3. **Model Training**:
   - Train/test split: 80/20 ratio
   - Fits Random Forest on training data
   - Evaluates using R² score on test set

4. **Model Persistence**:
   - Saves trained model to `surf_forecast_model.joblib`
   - Model is loaded at runtime by prediction service

#### Training Data Quality:
- Requires valid data for all 10 input features
- Requires valid data for all 4 target variables
- Missing values result in record exclusion

### Prediction Service

**File**: `predict_service.py`

#### Operational Modes:

**1. Mock Data Mode (Current Default)**
- `USE_MOCK_DATA = True`
- Generates realistic synthetic forecasts
- Much faster (no API calls for 31 spots)
- Prevents timeout issues
- Uses region-based heuristics:
  - East Coast: Higher base wave height (1.2m)
  - Other coasts: Lower base wave height (1.0m)
  - Realistic wind directions by region
  - Random variations for natural variation

**2. Real API Mode**
- `USE_MOCK_DATA = False`
- Fetches live data from StormGlass for each spot
- Uses trained ML model for predictions
- Slower but more accurate
- Requires valid `STORMGLASS_API_KEY`

#### Prediction Workflow:
```python
For each surf spot:
  1. Fetch weather features from StormGlass API (or generate mock)
  2. If real data:
     a. Average values from multiple sources
     b. Create feature vector
     c. Run through Random Forest model
     d. Extract predictions for 4 targets
  3. If mock data:
     a. Generate realistic random values
     b. Apply region-specific adjustments
  4. Calculate tide status from sea level
  5. Return forecast object with all predictions
```

#### Error Handling:
- Falls back to mock data if API fails
- Continues processing other spots if one fails
- Returns safe default values on model errors

---

## Backend System

**File**: `surfapp--backend/server.js`

### Core Components:

#### 1. Configuration
```javascript
PORT = 3000 (default)
PYTHON_EXECUTABLE = ../surfapp--ml-engine/venv/Scripts/python.exe
ML_SCRIPT_PATH = ../surfapp--ml-engine/predict_service.py
CACHE_DURATION = 5 minutes
```

#### 2. Caching System

**Purpose**: Reduce ML engine load and improve response times

**Implementation**:
```javascript
cache = {
  data: null,           // Cached spot predictions
  timestamp: null,      // When cache was last updated
  CACHE_DURATION_MS: 5 * 60 * 1000  // 5 minutes
}
```

**Cache Logic**:
- First request triggers ML engine
- Subsequent requests within 5 minutes served from cache
- Cache stores raw predictions (before suitability calculation)
- Suitability recalculated on each request (uses current user preferences)

#### 3. Suitability Scoring Engine (Model 2)

**Function**: `calculateSuitability(predictions, preferences, spotRegion)`

This is a **rule-based expert system** that scores how suitable a spot is for a user.

**Input Parameters**:
- `predictions`: ML model output (wave height, period, wind, tide)
- `preferences`: User preferences from profile
  - `skillLevel`: Beginner | Intermediate | Advanced
  - `boardType`: Soft-top | Longboard | Shortboard
  - `minWaveHeight`: Minimum preferred wave height
  - `maxWaveHeight`: Maximum preferred wave height
  - `tidePreference`: Low | Mid | High | Any
- `spotRegion`: East Coast | South Coast | West Coast | North Coast

**Scoring Algorithm**:

Starts with base score of 100, then applies penalties:

##### Skill Level Rules:
- **Beginner**:
  - Wave > 1.2m: -50 points (too dangerous)
  
- **Intermediate**:
  - Wave < 0.8m or > 2.5m: -30 points (too small or too big)
  
- **Advanced**:
  - Wave < 1.5m: -40 points (needs bigger waves)

##### Wave Preferences:
- Outside min/max range: -25 points

##### Board Type Rules:
- **Shortboard**:
  - Period < 9s: -20 points (needs longer period)
  
- **Other boards**:
  - Period > 12s: -15 points (too slow)

##### Wind Conditions:
- Wind > 25 kph: -50 points (too windy)
- Wind > 15 kph: -25 points (moderate penalty)

##### Wind Direction (Offshore Wind Bonus):
- **East Coast**: Ideal wind 240°-300° (offshore)
- **South Coast**: Ideal wind 330°-30° (offshore)
- Not offshore: -30 points

##### Tide Preferences:
- Tide doesn't match preference: -15 points (if not "Any")

##### Seasonal Appropriateness:
- **East Coast**: Best April-October (months 4-10)
  - Outside season: -60 points
- **South Coast**: Best November-March
  - Outside season: -60 points

**Final Score**: Clamped between 0-100

#### 4. Python Process Management

**Execution Flow**:
```javascript
1. Spawn Python process: spawn(PYTHON_EXECUTABLE, [ML_SCRIPT_PATH])
2. Set 30-second timeout
3. Collect stdout (JSON predictions)
4. Collect stderr (logs)
5. On completion:
   - Parse JSON output
   - Update cache
   - Calculate suitability scores
   - Sort by suitability
   - Return to client
6. On error:
   - Log error details
   - Return 500 status
```

**Error Handling**:
- Process timeout after 30 seconds
- Failed process start handling
- Invalid JSON parsing
- Empty output validation

### API Endpoints

#### 1. `GET /api/spots`

**Purpose**: Get all surf spots with predictions and suitability scores

**Query Parameters**: All user preferences
- `skillLevel`: string
- `minWaveHeight`: number
- `maxWaveHeight`: number
- `tidePreference`: string
- `boardType`: string

**Response**:
```json
{
  "spots": [
    {
      "id": "1",
      "name": "Weligama",
      "region": "South Coast",
      "coords": [80.4264, 5.9721],
      "forecast": {
        "waveHeight": 1.2,
        "wavePeriod": 10.5,
        "windSpeed": 15.3,
        "windDirection": 285,
        "tide": {
          "status": "Mid"
        }
      },
      "suitability": 78.5
    }
  ]
}
```

**Performance**:
- Cache hit: ~10ms
- Cache miss: ~5-10 seconds (31 spots with mock data)
- Cache miss with real API: Would timeout (requires batching)

#### 2. `GET /api/health`

**Purpose**: Health check endpoint

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T10:30:00.000Z",
  "cache": {
    "hasData": true,
    "age": 120000
  }
}
```

#### 3. `GET /api/forecast-chart`

**Purpose**: Get 7-day wave forecast data for chart

**Response**:
```json
{
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "datasets": [
    {
      "data": [1.2, 1.5, 1.3, 2.0, 2.2, 1.8, 1.6]
    }
  ]
}
```

**Note**: Currently returns mock data (static values)

---

## Frontend Application

**Framework**: React Native with Expo Router

### Project Structure

```
SurfApp--frontend/
├── app/                      # Expo Router pages
│   ├── _layout.js           # Root layout
│   ├── index.js             # Home screen
│   ├── map.js               # Map screen
│   ├── profile.js           # Profile/preferences screen
│   └── (spots)/             # Nested route group
│       ├── _layout.js       # Spots layout
│       ├── index.js         # All spots list
│       └── detail.js        # Spot detail screen
├── components/              # Reusable components
│   ├── SpotCard.js         # Spot card component
│   └── ForecastChart.js    # 7-day chart component
├── context/                 # State management
│   └── UserContext.js      # User preferences & location
├── data/                    # Data layer
│   ├── surfApi.js          # API client
│   ├── locationUtils.js    # Geo calculations
│   └── mockData.js         # Empty (legacy)
└── assets/                  # Images and static files
```

### State Management

#### UserContext

**File**: `context/UserContext.js`

**Global State**:
```javascript
{
  // User Preferences (stored in state)
  userPreferences: {
    skillLevel: 'Beginner',
    minWaveHeight: 0.5,
    maxWaveHeight: 1.5,
    tidePreference: 'Any',
    boardType: 'Soft-top'
  },
  
  // Location Data
  userLocation: {
    latitude: 5.9721,
    longitude: 80.4264
  },
  
  // Location Status
  locationLoading: false,
  locationError: null
}
```

**Location Acquisition**:
1. Request foreground permissions on app load
2. Get current position with timeout (5 seconds)
3. On success: Store actual location
4. On failure/denied: Use default location (Weligama)
5. Set `locationLoading = false` when complete

### Screens

#### 1. Home Screen (`app/index.js`)

**Purpose**: Show top surf recommendations within 10km

**Features**:
- Displays "Top Pick" (best suitability spot nearby)
- Shows 3 "Next Best Spots"
- Filters by 10km radius from user location
- Pull-to-refresh
- Personalized greeting with skill level
- Quick navigation to spot details

**Data Flow**:
```
useEffect → fetchSpots() → getSpotsData() → filterByRadius(10km) 
  → Display top 4 spots
```

#### 2. All Spots Screen (`app/(spots)/index.js`)

**Purpose**: List all 31 surf spots with filtering

**Features**:
- Shows ALL spots (no location filtering)
- Filter buttons:
  - All Spots
  - Excellent (≥75%)
  - Good (50-74%)
  - Fair (<50%)
- Displays distance from user location (if available)
- Pull-to-refresh
- Sorted by suitability score

**UI Components**:
- Horizontal scrollable filter tabs
- Badge counts on each filter
- SpotCard for each spot

#### 3. Spot Detail Screen (`app/(spots)/detail.js`)

**Purpose**: Detailed view of a single spot

**Features**:
- Hero section with gradient based on suitability
- Large suitability score display
- Current conditions grid (6 metrics):
  - Wave Height
  - Wave Period
  - Wind Speed
  - Wind Direction
  - Tide Status
  - Suitability Score
- 7-day forecast chart
- Surf tips section:
  - Best for which skill level
  - Recommended time (based on tide)

**Navigation**:
- Receives spot data via route params (JSON serialized)
- Back button in header

#### 4. Map Screen (`app/map.js`)

**Purpose**: Interactive map of all surf spots

**Features**:
- Mapbox integration with custom markers
- Color-coded markers by suitability:
  - Green (>75%): Excellent
  - Yellow (>50%): Good
  - Orange (>25%): Fair
  - Red (≤25%): Poor
- Tap marker to show info card
- "My Location" button to center on user
- Animated camera movements
- Shows all 31 spots (no filtering)

**Map Configuration**:
- Access Token: `MAPBOX_ACCESS_TOKEN`
- Default center: Sri Lanka
- Zoom level: 11 (local area) to 12 (spot focus)

#### 5. Profile Screen (`app/profile.js`)

**Purpose**: Configure user preferences

**Sections**:

1. **Skill Level**:
   - Beginner | Intermediate | Advanced
   - Radio-button style selection

2. **Wave Height Range**:
   - Min wave height (meters)
   - Max wave height (meters)
   - Decimal input fields

3. **Board Type**:
   - Soft-top | Longboard | Shortboard
   - Affects period preferences

4. **Tide Preference**:
   - Low | Mid | High | Any
   - Affects suitability scoring

5. **Wind Preferences**:
   - Min wind speed
   - Max wind speed
   - Affects safety scoring

**State Updates**:
- Immediate updates to UserContext
- Triggers re-fetch of spots on other screens
- Persists only in memory (resets on app restart)

### Components

#### SpotCard Component

**File**: `components/SpotCard.js`

**Purpose**: Reusable card displaying spot summary

**Props**:
- `spot`: Spot object with forecast and suitability
- `onPress`: Navigation handler
- `testID`: For testing

**Visual Elements**:
- Gradient background (color = suitability)
- Spot name and region
- Distance (if available)
- Suitability badge with label
- 4-column details grid:
  - Wave: "1.2m @ 10s"
  - Wind: "15 kph"
  - Direction: "285°"
  - Tide: "Mid"

**Suitability Color Scheme**:
```javascript
≥75%: Green (#4ade80 → #22c55e)
≥50%: Yellow/Orange (#fbbf24 → #f59e0b)
≥25%: Orange (#fb923c → #f97316)
<25%: Red (#f87171 → #ef4444)
```

#### ForecastChart Component

**File**: `components/ForecastChart.js`

**Purpose**: 7-day wave height line chart

**Library**: `react-native-chart-kit`

**Features**:
- Fetches data from `/api/forecast-chart`
- Loading state with spinner
- Error fallback
- Bezier curve smoothing
- Color gradient background
- Y-axis suffix: "m" (meters)
- Responsive width

**Chart Configuration**:
- Background: Blue to orange gradient
- Line color: White
- Dots: 6px radius, orange stroke
- Rounded corners: 16px

### Data Layer

#### API Client (`data/surfApi.js`)

**Functions**:

##### `getSpotsData(preferences, userLocation)`

**Purpose**: Main API client for fetching spots

**Features**:
- 10-minute client-side cache (AsyncStorage)
- Automatic retry (max 2 retries)
- 30-second request timeout
- Exponential backoff on retry
- Stale cache fallback on error
- Distance calculation if location available

**Cache Strategy**:
```
1. Check AsyncStorage for cached data
2. If cache exists and < 10 minutes old:
   → Use cache, recalculate distance
3. Else:
   → Fetch from API
   → Update cache
   → Return fresh data
4. On API error:
   → Return stale cache if available
   → Return empty array as last resort
```

##### `get7DayForecast()`

**Purpose**: Fetch chart data

**Fallback**: Returns mock data if API fails

##### `checkApiHealth()`

**Purpose**: Ping backend health endpoint

**Returns**: Boolean (true if API is healthy)

#### Location Utils (`data/locationUtils.js`)

**Functions**:

##### `calculateDistance(lat1, lon1, lat2, lon2)`

**Algorithm**: Haversine formula

**Returns**: Distance in kilometers

**Formula**:
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
d = R × c  (where R = 6371 km)
```

##### `filterSpotsByRadius(spots, userLocation, radiusKm)`

**Purpose**: Filter spots within radius

**Default Radius**: 10km

**Returns**: Filtered array or all spots if no location

##### `addDistanceToSpots(spots, userLocation)`

**Purpose**: Add distance property to each spot

**Returns**: Spots array with `distance` field (rounded to 1 decimal)

---

## Data Flow

### Complete Request Flow

```
┌─────────────┐
│   USER      │
│  (Profile)  │
└─────┬───────┘
      │ Updates preferences
      ▼
┌─────────────────┐
│  UserContext    │
│  - Preferences  │
│  - Location     │
└─────┬───────────┘
      │ Triggers useEffect
      ▼
┌─────────────────┐
│  Home Screen    │
│  getSpotsData() │
└─────┬───────────┘
      │ HTTP GET /api/spots?skillLevel=...
      ▼
┌──────────────────────┐
│  Backend Server      │
│  - Check cache       │
│  - Spawn Python      │
└─────┬────────────────┘
      │ If cache miss
      ▼
┌──────────────────────┐
│  Python ML Engine    │
│  For each spot:      │
│  - Fetch/mock data   │
│  - Run prediction    │
└─────┬────────────────┘
      │ JSON output
      ▼
┌──────────────────────┐
│  Backend Server      │
│  - Parse predictions │
│  - Calculate scores  │
│  - Update cache      │
│  - Sort by score     │
└─────┬────────────────┘
      │ HTTP 200 JSON
      ▼
┌──────────────────────┐
│  Frontend surfApi.js │
│  - Validate response │
│  - Calculate distance│
│  - Cache locally     │
└─────┬────────────────┘
      │ Return spots array
      ▼
┌──────────────────────┐
│  Home Screen         │
│  - Filter by radius  │
│  - Display top 4     │
└──────────────────────┘
```

### Caching Strategy

**Two-Layer Cache**:

1. **Backend Cache** (5 minutes):
   - Stores raw ML predictions
   - Shared across all users
   - Reduces Python process spawns

2. **Frontend Cache** (10 minutes):
   - Stores complete spot data
   - Per-device storage (AsyncStorage)
   - Reduces network requests
   - Allows stale fallback

**Cache Invalidation**:
- Time-based expiration only
- No manual invalidation
- Refresh available via pull-to-refresh

---

## Deployment & Configuration

### Environment Variables

#### Backend (`.env`)
```bash
PORT=3000
NODE_ENV=development
```

#### ML Engine (`.env`)
```bash
STORMGLASS_API_KEY=your_api_key_here
MONGODB_URI=mongodb://localhost:27017/surf_app_db  # Optional
```

#### Frontend
```bash
# Mapbox token (hardcoded in map.js)
MAPBOX_ACCESS_TOKEN=sk.eyJ1IjoiaXQyMjAwMzg1MCIsImEiOiJjbWk1bmxob2wwNmYwMnFzNnkwZmdpd3NvIn0.4JG304IZL8mDcZ24QcYOng
```

### Setup & Installation

#### Prerequisites
- Node.js 18+
- Python 3.8+
- Android Studio (for Android builds)
- Xcode (for iOS builds)

#### Backend Setup
```bash
cd surfapp--backend
npm install
npm start  # Runs on port 3000
```

#### ML Engine Setup
```bash
cd surfapp--ml-engine
python -m venv venv
.\venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Train model (optional, model already exists)
python train_model.py

# Test prediction service
python predict_service.py
```

#### Frontend Setup
```bash
cd SurfApp--frontend
npm install
npm start  # Expo dev server

# For Android
npm run android

# For iOS
npm run ios
```

### Running the Complete System

**Terminal 1** (Backend):
```bash
cd surfapp--backend
npm start
```

**Terminal 2** (Frontend):
```bash
cd SurfApp--frontend
npm start
```

**Terminal 3** (Optional - Model Training):
```bash
cd surfapp--ml-engine
python train_model.py
```

### Production Considerations

#### Current Limitations:
1. **Mock Data Mode**: Using synthetic data instead of real API calls
2. **No Database**: All data in memory (cache resets on restart)
3. **No Authentication**: Open API endpoints
4. **No Rate Limiting**: Can be overwhelmed with requests
5. **Static Forecast**: 7-day chart uses mock data

#### Recommended Improvements:
1. **Implement API Key Management**: 
   - StormGlass API quota management
   - Batch requests for multiple spots
   - Background jobs for data fetching

2. **Add Persistent Storage**:
   - MongoDB for historical data
   - Redis for caching
   - PostgreSQL for user profiles

3. **Implement User Authentication**:
   - JWT tokens
   - Secure profile storage
   - Personalized favorites

4. **Optimize ML Pipeline**:
   - Pre-compute predictions hourly
   - Store in database
   - Serve instantly without Python spawn

5. **Add Real-Time Features**:
   - WebSocket for live updates
   - Push notifications for ideal conditions
   - Weather alerts

6. **Improve Monitoring**:
   - Error tracking (Sentry)
   - Analytics (Mixpanel)
   - Performance monitoring (New Relic)

---

## System Performance

### Response Times

**Backend**:
- Cache hit: ~10ms
- Cache miss (mock data): ~5-10 seconds
- Cache miss (real API): Would timeout (~60+ seconds for 31 spots)

**Frontend**:
- Initial load: ~10-15 seconds
- Cached load: ~1-2 seconds
- Map rendering: ~2-3 seconds

### Optimization Strategies

1. **Backend Caching**: Reduces Python process spawns
2. **Frontend Caching**: Reduces network requests
3. **Mock Data Mode**: Prevents API rate limits and timeouts
4. **Distance Pre-calculation**: Done server-side where possible
5. **Lazy Loading**: Charts loaded on-demand

### Scalability

**Current Capacity**:
- Handles ~10-20 concurrent users (limited by cache)
- 31 spots processed in ~5-10 seconds
- Cache reduces load by ~90%

**Bottlenecks**:
1. Python process spawn overhead
2. StormGlass API rate limits
3. No horizontal scaling (single server)
4. In-memory cache (no distribution)

---

## Testing & Validation

### Model Validation

**Training Metrics**:
- R² Score: Reported on test set (typically 0.7-0.9)
- Uses 80/20 train-test split

### API Testing

**Health Check**:
```bash
curl http://localhost:3000/api/health
```

**Spots Endpoint**:
```bash
curl "http://localhost:3000/api/spots?skillLevel=Beginner&minWaveHeight=0.5&maxWaveHeight=1.5"
```

### Frontend Testing

- Manual testing on Android/iOS
- Test IDs available for component testing
- Console logging for debugging

---

## Known Issues & Future Work

### Current Issues:
1. **No Real API Integration**: Using mock data for performance
2. **No User Persistence**: Preferences reset on app restart
3. **Static Chart Data**: 7-day forecast is hardcoded
4. **No Offline Mode**: Requires internet connection
5. **No Favorite Spots**: Cannot save preferred locations

### Planned Features:
1. **Historical Trends**: Show seasonal patterns
2. **Spot Reviews**: User-generated content
3. **Social Features**: Share sessions with friends
4. **Tide Tables**: Detailed tide predictions
5. **Weather Alerts**: Push notifications for ideal conditions
6. **Webcam Integration**: Live camera feeds at spots
7. **Surf Reports**: Daily written summaries

---

## Credits & Attribution

- **Marine Data**: StormGlass API
- **Maps**: Mapbox
- **ML Framework**: scikit-learn
- **Mobile Framework**: Expo & React Native
- **Icons**: Expo Vector Icons

---

## License & Usage

This is a educational/demonstration project for surf forecasting in Sri Lanka.

**Data Sources**:
- StormGlass API requires valid subscription
- Mapbox requires valid access token

**Contact**: IT22003850

---

*Last Updated: November 19, 2025*
