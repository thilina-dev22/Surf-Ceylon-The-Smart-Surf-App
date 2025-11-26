# 🏄‍♂️ Surf Ceylon - Complete Technical Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Machine Learning Engine](#machine-learning-engine)
3. [Backend Process](#backend-process)
4. [Frontend Flow](#frontend-flow)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Deployment Guide](#deployment-guide)

---

## 🏗 System Architecture

Surf Ceylon is a full-stack surf forecasting application consisting of three main components:

### **Component Overview**

```
┌────────────────────────────────────────────────────────────┐
│                    USER (Mobile App)                       │
└────────────────────────────────────────────────────────────┘
                           ↓ ↑
┌────────────────────────────────────────────────────────────┐
│              FRONTEND (React Native + Expo)                │
│  • Authentication & User Management                        │
│  • Location Services                                       │
│  • Spot Discovery & Recommendations                        │
│  • Map Visualization                                       │
│  • Session Tracking                                        │
└────────────────────────────────────────────────────────────┘
                           ↓ ↑
┌────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                   │
│  • API Gateway                                             │
│  • Enhanced Suitability Calculator                         │
│  • Cache Management (5 min)                                │
│  • Session & User Routes                                   │
└────────────────────────────────────────────────────────────┘
         ↓ ↑                           ↓ ↑
┌──────────────────┐         ┌──────────────────┐
│   ML ENGINE      │         │    MONGODB       │
│   (Python)       │         │   (Database)     │
│ • Forecast Model │         │ • Users          │
│ • Personalization│         │ • Sessions       │
└──────────────────┘         └──────────────────┘
```

### **Technology Stack**

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React Native, Expo, React Navigation, AsyncStorage |
| **Backend** | Node.js, Express, Mongoose, CORS |
| **ML Engine** | Python 3.8+, scikit-learn, pandas, numpy, joblib |
| **Database** | MongoDB (optional, app works without it) |
| **APIs** | StormGlass Weather API (optional, has mock mode) |

---

## 🧠 Machine Learning Engine

Located in: `surfapp--ml-engine/`

### **1. Forecast Model (surf_forecast_model.joblib)**

**Purpose:** Predicts surf conditions based on raw weather data

**Algorithm:** Random Forest Regressor with 200 trees

**Input Features (15 total):**
- **Original (10):** swellHeight, swellPeriod, swellDirection, windSpeed, windDirection, seaLevel, gust, secondarySwellHeight, secondarySwellPeriod, secondarySwellDirection
- **Engineered (5):**
  - `swellEnergy = swellHeight² × swellPeriod` - Wave power indicator
  - `offshoreWind = windSpeed × cos(windDirection - 270°)` - Wind favorability
  - `totalSwellHeight = swellHeight + secondarySwellHeight` - Combined swell
  - `windSwellInteraction = windSpeed × swellHeight` - Wind-wave interaction
  - `periodRatio = swellPeriod / (secondarySwellPeriod + 1)` - Wave quality

**Output Targets (4):**
- Wave Height (meters)
- Wave Period (seconds)
- Wind Speed (m/s)
- Wind Direction (degrees)

**Performance:**
```
Overall R² Score: 79.43%
├─ Wave Height:     77.18% (±13cm error)
├─ Wave Period:     44.33% (±1.1s error)
├─ Wind Speed:      96.83% (±0.27 m/s error)
└─ Wind Direction:  99.39% (±4.6° error)
```

**Training Data:**
- 20,000+ records from Weligama and Arugam Bay
- Historical data from Feb 2023 - Nov 2025
- Data preprocessing: Duplicates removed, outliers filtered (IQR method)

**Key Files:**
- `train_model.py` - Training script with feature engineering
- `predict_service.py` - Production prediction service
- `surf_forecast_model.joblib` - Trained model (72 MB)
- `model_features.txt` - Feature list and importance

### **2. Personalization Model (preference_model.joblib)**

**Purpose:** Learns user preferences from surf session history

**Algorithm:** Ensemble of Random Forest models
- Skill Level Classifier (Beginner/Intermediate/Advanced)
- Wave Height Preference Regressor
- Wind Speed Preference Regressor

**How It Works:**

```python
# 1. DATA COLLECTION
User logs session → {
  spot: "Arugam Bay",
  conditions: {waveHeight: 1.8, windSpeed: 12, ...},
  rating: 5,
  duration: 90,
  wouldReturn: true
}

# 2. FEATURE EXTRACTION (per user)
Features = {
  avg_wave_height: 1.6,
  avg_wind_speed: 10.5,
  prefers_high_waves: 1,
  prefers_low_wind: 1,
  total_sessions: 25,
  avg_rating: 4.2,
  would_return_rate: 0.85,
  ...
}

# 3. PREDICTION
Model predicts → {
  skillLevel: "Intermediate",
  skillConfidence: 0.92,
  preferredWaveHeight: 1.7,
  preferredWindSpeed: 11.2
}

# 4. APPLICATION
Backend uses predictions to adjust suitability scores
for spot recommendations
```

**Minimum Requirements:**
- 10+ sessions per user for training
- At least 50 total sessions for robust model

**Key Files:**
- `train_personalization_model.py` - Training pipeline
- `predict_personalization.py` - Inference service
- `preference_model.joblib` - Trained models
- `preference_encoders.joblib` - Label encoders

### **ML Workflow:**

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: DATA COLLECTION                                │
│ collect_historical_data.py fetches weather from API    │
│ → Saves to weligama_historical_data_fixed.json         │
│ → Saves to arugam_bay_historical_data_fixed.json       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: FEATURE VALIDATION                             │
│ validate_features.py analyzes correlations             │
│ → Creates correlation_heatmap.png                      │
│ → Generates FEATURE_ANALYSIS_RESULTS.md                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: MODEL TRAINING                                 │
│ train_model.py or train_with_local_data.py             │
│ → Feature Engineering (5 new features)                 │
│ → Train Random Forest (200 trees)                      │
│ → Evaluate performance                                 │
│ → Save surf_forecast_model.joblib (72 MB)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: PRODUCTION INFERENCE                           │
│ predict_service.py loads model                         │
│ → Receives weather data (API or mock)                  │
│ → Applies feature engineering                          │
│ → Predicts surf conditions                             │
│ → Returns JSON to backend                              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Backend Process

Located in: `surfapp--backend/`

### **Server Architecture (server.js)**

**Core Responsibilities:**
1. **API Gateway** - Routes all frontend requests
2. **ML Integration** - Spawns Python processes for predictions
3. **Suitability Calculation** - Applies business logic to ML outputs
4. **Caching** - 5-minute cache to reduce ML load
5. **MongoDB Management** - Session and user data (optional)

**Startup Flow:**
```javascript
1. Load environment variables (.env)
2. Connect to MongoDB (optional, graceful degradation)
3. Initialize EnhancedSuitabilityCalculator
4. Mount routes: /api/auth, /api/sessions, /api/personalization
5. Start server on PORT 3000
```

### **Enhanced Suitability Calculator**

Located in: `EnhancedSuitabilityCalculator.js` (650 lines)

**Six Innovative Scoring Modules:**

#### **1. Time-Aware Score (0-100)**
Adjusts based on time of day and tidal conditions:
```javascript
Bonuses:
+ Dawn Patrol (5-7 AM) + light winds: +15 points
+ Golden Hours (6-9 AM): +20 points
+ Offshore wind window (6 AM - 6 PM): +15 points
+ Evening session (4-6 PM): +10 points
+ Optimal tide timing: +8-10 points

Penalties:
- Midday heat (11 AM - 2 PM): -10 points
- Low tide on reef (morning): -5 points
```

#### **2. Crowd Prediction (0-100)**
Estimates crowd levels using multiple factors:
```javascript
Crowd Factor Calculation:
baseLevel = isWeekend ? 0.7 : 0.3

Adjustments:
+ High season (Dec-Mar, Jul-Aug): +0.2
+ Popular spot: +0.2
+ Peak hours (8 AM - 4 PM): +0.3
+ High accessibility: +0.3
- Dawn patrol: -0.2
- Remote location: -0.2

Final Score:
High crowd (>0.7): 30 points
Medium crowd (0.4-0.7): 60 points
Low crowd (<0.4): 100 points
```

#### **3. Safety Score (0-100)**
Evaluates hazards based on skill level:
```javascript
Safe Wave Heights by Skill:
Beginner:     max 1.5m (ideal 1.0m)
Intermediate: max 2.5m (ideal 1.8m)
Advanced:     max 5.0m (ideal 2.5m)

Penalties:
- Wave too large: -20 to -40 points
- Strong winds (>35 km/h): -30 points
- Offshore wind + beginner: -25 points (safety hazard)
- Low tide + reef: -20 points
- Rip current spots: -15 points (beginners)

Warnings Generated:
⚠️ Waves too large for skill level
🌬️ Strong winds - dangerous conditions
🪨 Reef break - wear protection
⚠️ Strong offshore winds - stay close to shore
```

#### **4. Consistency Score (0-100)**
Measures condition stability:
```javascript
Period Quality:
≥14s (groundswell): +35 points
12-14s (good swell): +25 points
10-12s (moderate): +15 points
8-10s (short period): +5 points
<8s (choppy): -20 points

Wind Stability:
8-15 km/h (ideal): +20 points
5-20 km/h (good): +10 points
<5 km/h (glassy): +5 points
>30 km/h (gusty): -30 points

Wave Height:
1.0-2.5m (sweet spot): +10 points
<0.5m (too small): -10 points
>4.0m (varies): -10 points
```

#### **5. Wave Quality Score (0-100)**
Matches waves to user preferences:
```javascript
score = 100 - (abs(current - preferred) × 25)

Bonuses:
+ Within 20% of preferred: +10 points
+ Beginner + small waves (<1.0m): +10 points
+ Advanced + large waves (>2.0m): +10 points
```

#### **6. Wind Quality Score (0-100)**
Evaluates wind conditions:
```javascript
score = 100 - (abs(current - preferred) × 2.5)

Bonuses:
+ Offshore wind (270-360°): +20 points
+ Light winds (<8 km/h): +15 points
+ Side-shore: +5 points

Penalties:
- Onshore wind: -15 points
- Strong winds (>30 km/h): -20 points
```

**Adaptive Weighted Scoring:**

Different skill levels prioritize different factors:

```javascript
Beginner Weights:
safety: 30%, wave: 25%, crowd: 15%, wind: 10%, time: 10%, consistency: 10%

Intermediate Weights:
wave: 30%, consistency: 20%, safety: 20%, wind: 15%, time: 10%, crowd: 5%

Advanced Weights:
wave: 35%, wind: 20%, consistency: 20%, time: 10%, safety: 10%, crowd: 5%

Final Score = Σ(factor_score × weight) + region_bonus
```

**Smart Recommendations Engine:**

Generates 5 context-aware tips:
```javascript
Examples:
✅ "Good conditions - should be a fun session!"
⚠️ "Challenging conditions - consider alternatives"
🌅 "Prime evening session window - conditions look good!"
📊 "Consistent swell - expect clean, organized sets"
💨 "Offshore winds - excellent grooming conditions"
👥 "High crowd expected - nearby alternatives may be less busy"
```

### **API Request Flow**

**GET /api/spots?skillLevel=Intermediate**

```
1. Parse user preferences from query params
2. Check cache (5-minute TTL)
   ├─ HIT → Return enhanced spots with user-specific scores
   └─ MISS → Continue to step 3
3. Spawn Python process: python predict_service.py
4. Python returns raw forecasts for 31 spots
5. Cache raw forecasts
6. For each spot:
   ├─ Merge with SPOT_METADATA (bottomType, accessibility, region)
   ├─ Calculate Enhanced Suitability (6 modules)
   ├─ Generate recommendations
   ├─ Generate warnings
   └─ Sanitize NaN/Infinity values
7. Sort spots by score (highest first)
8. Return JSON to frontend
```

**Python Process Communication:**

```javascript
// Backend spawns Python
const pythonProcess = spawn(PYTHON_EXECUTABLE, [ML_SCRIPT_PATH]);

// Collect output
pythonProcess.stdout.on('data', (data) => pythonOutput += data);

// Parse JSON result
const result = JSON.parse(pythonOutput);
// {spots: [{name, coords, forecast: {waveHeight, windSpeed, ...}}, ...]}
```

### **Routes**

**Authentication Routes (`routes/auth.js`):**
- POST `/api/auth/register` - Create new user
- POST `/api/auth/login` - Login and get user data
- GET `/api/auth/user/:id` - Get user profile
- PUT `/api/auth/user/:id` - Update user preferences

**Session Routes (`routes/sessions.js`):**
- POST `/api/sessions/start` - Start surf session
- POST `/api/sessions/:id/end` - End session with rating
- GET `/api/sessions/user/:userId` - Get user's session history
- GET `/api/sessions/user/:userId/insights` - Get aggregated insights

**Personalization Routes (`routes/personalization.js`):**
- GET `/api/personalization/recommendations/:userId/:spotId` - Personalized recommendations

### **Database Models**

**User Model (`models/User.js`):**
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  preferences: {
    skillLevel: String,
    preferredWaveHeight: Number,
    preferredWindSpeed: Number,
    boardType: String,
    tidePreference: String,
    minWaveHeight: Number,
    maxWaveHeight: Number
  },
  createdAt: Date,
  lastLogin: Date
}
```

**Session Model (`models/Session.js`):**
```javascript
{
  userId: ObjectId,
  spotId: String,
  spotName: String,
  spotRegion: String,
  startTime: Date,
  endTime: Date,
  duration: Number, // minutes
  conditions: {
    waveHeight: Number,
    wavePeriod: Number,
    windSpeed: Number,
    windDirection: Number,
    tide: String,
    crowdLevel: String
  },
  rating: Number (1-5),
  enjoyment: Number (0-100),
  wouldReturn: Boolean,
  comments: String,
  createdAt: Date
}
```

---

## 📱 Frontend Flow

Located in: `SurfApp--frontend/`

### **Navigation Structure**

```
App Root (_layout.js)
├─ Tabs (Bottom Navigation)
│  ├─ Home (index.js) - Top recommendations
│  ├─ Spots ((spots)/index.js) - All spots list
│  ├─ Map (map.js) - Interactive map
│  └─ Profile (profile.js) - User dashboard
├─ Auth Stack
│  ├─ Login (login.js)
│  └─ Register (register.js)
└─ Detail Screen ((spots)/[id].js) - Spot details
```

### **State Management**

**UserContext (context/UserContext.js):**

Global state provider for:
- User authentication
- User preferences
- User location (GPS)
- Session management

```javascript
const UserContext = {
  user: {id, name, email, ...},
  userPreferences: {
    skillLevel: 'Intermediate',
    preferredWaveHeight: 1.5,
    preferredWindSpeed: 15,
    boardType: 'Shortboard',
    tidePreference: 'Any',
    minWaveHeight: 0.5,
    maxWaveHeight: 2.5
  },
  userLocation: {latitude, longitude} || null,
  locationLoading: boolean,
  login: (email, password) => {},
  logout: () => {},
  updatePreferences: (prefs) => {},
  activeSession: {sessionId, spotId, ...} || null,
  startSession: (spotId) => {},
  endSession: (rating, wouldReturn) => {}
}
```

### **Key Screens**

#### **1. Home Screen (app/index.js)**

**Purpose:** Display personalized top recommendations

**Flow:**
```
1. Get user preferences from UserContext
2. Get user location (GPS)
3. Call getSpotsData(preferences, location)
4. Filter spots within 10km radius
5. Display top pick (highest score)
6. Display next 3 best spots
7. Pull-to-refresh enabled
```

**UI Elements:**
- Header with welcome message
- Login banner (if not authenticated)
- Location status
- Top recommendation card (highlighted)
- "Also Worth Checking" section
- "View All Spots" button

#### **2. Spots List (app/(spots)/index.js)**

**Purpose:** Browse all 31 surf spots

**Features:**
- Search by name
- Filter by:
  - Region (South/East/West/North coasts)
  - Suitability level (Excellent/Good/Fair)
  - Distance (if location available)
- Sort by: Score, Distance, Name
- Pull-to-refresh
- Infinite scroll (paginated)

**Spot Card (components/SpotCard.js):**
```jsx
<SpotCard>
  <Header>
    <Name>Arugam Bay</Name>
    <Region>East Coast</Region>
  </Header>
  
  <Score>
    <CircularProgress value={85} />
    <Label>Excellent</Label>
  </Score>
  
  <Conditions>
    🌊 Wave: 1.8m / 12s
    💨 Wind: 10 km/h offshore
    🌊 Tide: Mid
  </Conditions>
  
  <Breakdown>
    Wave: 90 | Wind: 85 | Safety: 95
    Time: 75 | Crowd: 100 | Consistency: 80
  </Breakdown>
  
  <Recommendations>
    ✅ "Good conditions - should be a fun session!"
    🌅 "Prime evening session window"
  </Recommendations>
  
  {user && <StartSessionButton />}
</SpotCard>
```

#### **3. Spot Detail (app/(spots)/[id].js)**

**Purpose:** Comprehensive spot information

**Sections:**
1. **Header**
   - Spot name, region
   - Overall suitability score (circular progress)
   - Current conditions

2. **Score Breakdown Chart** (components/ScoreBreakdown.js)
   - Radar/spider chart showing 6 factors
   - Visual comparison of strengths/weaknesses

3. **5-Day Forecast Chart** (components/ForecastChart.js)
   - Line chart: Wave height over time
   - Weather conditions per day

4. **Suitability Radar** (components/SuitabilityRadarChart.js)
   - Interactive visualization

5. **Recommendations**
   - Smart tips (5 max)
   - Safety warnings

6. **Conditions Table**
   - Wave Height/Period
   - Wind Speed/Direction
   - Tide, Crowd Level
   - Bottom Type, Accessibility

7. **Actions**
   - Start Session button (if logged in)
   - Add to Favorites
   - Share with friends
   - Get Directions (opens maps app)

#### **4. Map Screen (app/map.js)**

**Purpose:** Visual exploration of spots

**Features:**
- React Native Maps (Google/Apple)
- Custom markers for each spot
  - Color-coded by suitability (green/yellow/orange/red)
  - Size indicates score
- User location marker (blue dot)
- Info window on marker tap
- "Center on Me" button
- Cluster markers when zoomed out

**Marker Data:**
```javascript
<Marker
  coordinate={{latitude, longitude}}
  title={spot.name}
  description={`${spot.score}% ${spot.suitability}`}
  pinColor={getColorFromScore(spot.score)}
  onPress={() => navigate to detail screen}
/>
```

#### **5. Profile Screen (app/profile.js)**

**Purpose:** User dashboard and settings

**Tabs:**
1. **Stats**
   - Total sessions: 24
   - Favorite spot: Arugam Bay (8 visits)
   - Average rating: 4.2 ⭐
   - Total surf time: 32 hours
   - Most common conditions
   - Session calendar heatmap

2. **Preferences**
   - Skill Level selector
   - Wave height range (slider)
   - Wind speed preference
   - Board type
   - Tide preference
   - Preferred region
   - Save button

3. **Session History**
   - List of past sessions
   - Each entry shows:
     - Spot name, date, duration
     - Conditions
     - Rating
     - Comments
   - Tap to view details

4. **Account**
   - Edit profile (name, email)
   - Change password
   - Notification settings
   - Data export
   - Logout

### **Data Layer (data/surfApi.js)**

**Main API Functions:**

```javascript
// Fetch spots with suitability scores
getSpotsData(preferences, userLocation) → Promise<Spot[]>

// Get 7-day forecast chart data
get7DayForecast() → Promise<ChartData>

// Check backend health
checkApiHealth() → Promise<boolean>

// Session tracking
startSession(userId, spotId, spotName, conditions) → Promise<{sessionId}>
endSession(sessionId, rating, wouldReturn, comments) → Promise<Session>
getUserSessions(userId, limit) → Promise<{sessions[], total}>
getUserInsights(userId) → Promise<Insights>

// Personalization
getPersonalizedRecommendations(userId, spotId) → Promise<Recommendations>
```

**Caching Strategy:**
- AsyncStorage for offline support
- 10-minute cache TTL
- Stale-while-revalidate pattern
- Cache invalidation on user preference change

**Data Sanitization:**
```javascript
// Removes NaN, Infinity, undefined to prevent JSON errors
sanitizeSpotData(spot) → Clean Spot Object
stringifyForNav(obj) → Safe JSON String
parseFromNav(jsonString) → Parsed Object
```

### **Location Services (data/locationUtils.js)**

```javascript
// Request GPS permissions
requestLocationPermission() → Promise<boolean>

// Get current location
getCurrentLocation() → Promise<{latitude, longitude}>

// Calculate distance between points (Haversine formula)
calculateDistance(lat1, lon1, lat2, lon2) → kilometers

// Add distance to each spot
addDistanceToSpots(spots, userLocation) → Spots with distance

// Filter by radius
filterSpotsByRadius(spots, userLocation, radiusKm) → Nearby Spots
```

---

## 🔄 Complete Data Flow

### **Scenario 1: User Opens App (First Time)**

```
1. App Launch
   ├─ Check AsyncStorage for cached user
   ├─ Initialize UserContext with defaults
   │  └─ skillLevel: 'Beginner'
   └─ Request GPS permission

2. Location Service
   ├─ Get GPS coordinates
   └─ Update UserContext.userLocation

3. Home Screen Mounts
   ├─ Read userPreferences from context
   ├─ Call getSpotsData(preferences, location)
   │  ├─ Check AsyncStorage cache (miss)
   │  ├─ Fetch from backend API
   │  │  └─ GET /api/spots?skillLevel=Beginner&...
   │  │
   │  └─ Backend receives request
   │     ├─ Check server cache (miss)
   │     ├─ Spawn Python process
   │     │  └─ python predict_service.py
   │     │
   │     └─ Python Service
   │        ├─ Load surf_forecast_model.joblib
   │        ├─ Generate mock forecasts (31 spots)
   │        │  OR fetch from StormGlass API
   │        ├─ Apply feature engineering
   │        ├─ Predict conditions (waveHeight, windSpeed, ...)
   │        └─ Return JSON to stdout
   │     
   │     └─ Backend processes Python output
   │        ├─ Parse JSON
   │        ├─ Cache raw forecasts (5 min)
   │        ├─ For each spot:
   │        │  ├─ Merge SPOT_METADATA
   │        │  ├─ Calculate Time Score
   │        │  ├─ Predict Crowd Level
   │        │  ├─ Calculate Safety Score
   │        │  ├─ Calculate Consistency Score
   │        │  ├─ Calculate Wave Quality Score
   │        │  ├─ Calculate Wind Quality Score
   │        │  ├─ Apply Adaptive Weights (Beginner)
   │        │  ├─ Calculate Final Score
   │        │  ├─ Generate Recommendations
   │        │  ├─ Generate Warnings
   │        │  └─ Sanitize data
   │        ├─ Sort by score (desc)
   │        └─ Return to frontend
   │
   ├─ Frontend receives spots
   ├─ Cache in AsyncStorage (10 min)
   ├─ Calculate distances (if location available)
   ├─ Filter within 10km radius
   └─ Render UI
      ├─ Top Pick (highest score)
      └─ Next 3 Best Spots

4. User Interaction
   └─ Tap on spot card
      └─ Navigate to Spot Detail Screen
         ├─ Display suitability breakdown
         ├─ Show 5-day forecast
         └─ Display recommendations
```

### **Scenario 2: User Logs In & Starts Session**

```
1. User taps "Login"
   └─ Navigate to Login Screen
      ├─ Enter email/password
      ├─ POST /api/auth/login
      │  └─ Backend validates credentials
      │     ├─ Compare bcrypt hash
      │     ├─ Update lastLogin
      │     └─ Return user object
      └─ Store in UserContext & AsyncStorage

2. Preferences Applied
   ├─ UserContext updated
   │  └─ skillLevel: 'Intermediate'
   ├─ Clear cache (preferences changed)
   └─ Refetch spots with new preferences
      └─ Backend uses Intermediate weights
         ├─ wave: 30%, consistency: 20%, safety: 20%
         ├─ wind: 15%, time: 10%, crowd: 5%
         └─ Different recommendations generated

3. User browses to Arugam Bay
   └─ Spot Detail Screen
      ├─ Score: 88% (Excellent)
      ├─ Breakdown visible
      ├─ User taps "Start Session"
      │
      └─ POST /api/sessions/start
         ├─ Backend creates Session document
         │  └─ {userId, spotId, startTime, conditions}
         └─ Returns sessionId
      
      └─ UserContext.activeSession updated

4. User Surfs (90 minutes)

5. User taps "End Session"
   └─ Rating Modal appears
      ├─ User rates 5 stars
      ├─ Would return: Yes
      ├─ Comments: "Perfect conditions!"
      │
      └─ POST /api/sessions/:id/end
         ├─ Backend updates Session
         │  └─ {endTime, duration: 90, rating: 5, ...}
         └─ Triggers personalization update
            └─ User has 11 sessions now
               └─ Eligible for ML personalization

6. Personalization Training (Background)
   └─ train_personalization_model.py
      ├─ Load user's 11 sessions
      ├─ Extract features
      │  ├─ avg_wave_height: 1.7m
      │  ├─ prefers_high_waves: 1
      │  └─ avg_rating: 4.5
      ├─ Predict preferences
      │  ├─ preferredWaveHeight: 1.8m
      │  └─ preferredWindSpeed: 11 km/h
      └─ Save to preference_model.joblib

7. Next Session
   └─ Backend applies learned preferences
      └─ Spots ranked higher if conditions match
         learned patterns (1.8m waves, 11 km/h winds)
```

### **Scenario 3: Offline Usage**

```
1. User opens app with no internet
   ├─ Backend request fails
   └─ Fallback to AsyncStorage cache
      ├─ Load cached spots (may be stale)
      ├─ Display with "Offline Mode" banner
      └─ Most features work (read-only)

2. User regains connection
   ├─ Pull-to-refresh
   └─ Fetch fresh data
      ├─ Clear stale cache
      └─ Normal flow resumes
```

---

## 📊 Database Schema

### **Collections**

**users**
```json
{
  "_id": ObjectId("..."),
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2b$10$hashedpassword...",
  "preferences": {
    "skillLevel": "Intermediate",
    "preferredWaveHeight": 1.5,
    "preferredWindSpeed": 15,
    "boardType": "Shortboard",
    "tidePreference": "Mid",
    "minWaveHeight": 0.8,
    "maxWaveHeight": 2.5
  },
  "createdAt": ISODate("2025-11-20T..."),
  "lastLogin": ISODate("2025-11-25T...")
}
```

**sessions**
```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "spotId": "13",
  "spotName": "Arugam Bay",
  "spotRegion": "East Coast",
  "startTime": ISODate("2025-11-25T06:30:00Z"),
  "endTime": ISODate("2025-11-25T08:00:00Z"),
  "duration": 90,
  "conditions": {
    "waveHeight": 1.8,
    "wavePeriod": 12,
    "windSpeed": 10,
    "windDirection": 280,
    "tide": "Mid",
    "crowdLevel": "Low"
  },
  "rating": 5,
  "enjoyment": 95,
  "wouldReturn": true,
  "comments": "Perfect morning session!",
  "createdAt": ISODate("2025-11-25T08:00:00Z")
}
```

### **Indexes**

```javascript
// Users
users.createIndex({ email: 1 }, { unique: true })

// Sessions
sessions.createIndex({ userId: 1, createdAt: -1 })
sessions.createIndex({ spotId: 1 })
sessions.createIndex({ startTime: 1 })
```

---

## 🌐 API Endpoints Reference

### **Public Endpoints**

```
GET /api/health
  Response: {status: 'ok', timestamp, cache: {...}}

GET /api/spots
  Query Params:
    - skillLevel: Beginner|Intermediate|Advanced
    - preferredWaveHeight: Number
    - preferredWindSpeed: Number
    - boardType: String
    - tidePreference: Any|Low|Mid|High
    - minWaveHeight: Number
    - maxWaveHeight: Number
  Response: {spots: [...]}

GET /api/forecast-chart
  Response: {labels: [...], datasets: [...]}
```

### **Authentication Endpoints**

```
POST /api/auth/register
  Body: {name, email, password, preferences}
  Response: {user: {...}, message}

POST /api/auth/login
  Body: {email, password}
  Response: {user: {...}}

GET /api/auth/user/:id
  Response: {user: {...}}

PUT /api/auth/user/:id
  Body: {preferences: {...}}
  Response: {user: {...}}
```

### **Session Endpoints**

```
POST /api/sessions/start
  Body: {userId, spotId, spotName, conditions}
  Response: {sessionId, message}

POST /api/sessions/:id/end
  Body: {rating, wouldReturn, comments}
  Response: {session: {...}}

GET /api/sessions/user/:userId?limit=20
  Response: {sessions: [...], total}

GET /api/sessions/user/:userId/insights
  Response: {
    totalSessions,
    favoriteSpot,
    avgRating,
    preferredConditions,
    ...
  }
```

### **Personalization Endpoints**

```
GET /api/personalization/recommendations/:userId/:spotId
  Response: {
    personalizedScore,
    insights,
    recommendations
  }
```

---

## 🚀 Deployment Guide

### **Prerequisites**

- Node.js 16+
- Python 3.8+
- MongoDB (optional)
- Expo CLI

### **Backend Deployment**

```bash
cd surfapp--backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
PORT=3000
MONGODB_URI=mongodb://localhost:27017/surfceylon
PYTHON_PATH=/path/to/venv/bin/python

# 3. Start server
npm start
# or for development:
npm run dev
```

### **ML Engine Setup**

```bash
cd surfapp--ml-engine

# 1. Create virtual environment
python -m venv venv

# 2. Activate
# Windows:
venv\Scripts\activate
# Unix:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Verify model exists
ls -lh surf_forecast_model.joblib
# Should be ~72 MB

# 5. Test prediction service
python predict_service.py
# Should output JSON with 31 spots
```

### **Frontend Deployment**

```bash
cd SurfApp--frontend

# 1. Install dependencies
npm install

# 2. Configure API endpoint
# Edit data/config.js:
export const API_URL = 'http://YOUR_SERVER:3000/api';

# 3. Start development
npx expo start

# 4. Build for production
# Android:
eas build --platform android

# iOS:
eas build --platform ios
```

### **Environment Variables**

**Backend (.env):**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/surfceylon
STORMGLASS_API_KEY=your_api_key_here
PYTHON_PATH=/path/to/venv/bin/python
NODE_ENV=production
```

**ML Engine (.env):**
```env
STORMGLASS_API_KEY=your_api_key_here
```

### **Production Checklist**

- [ ] MongoDB replica set configured
- [ ] HTTPS/SSL certificates installed
- [ ] CORS configured for production domain
- [ ] Environment variables secured
- [ ] ML model file verified (72 MB)
- [ ] StormGlass API key active (or mock mode enabled)
- [ ] Error logging configured (Sentry, etc.)
- [ ] CDN for assets
- [ ] Load balancer for backend
- [ ] Backup strategy for MongoDB
- [ ] CI/CD pipeline setup

---

## 📝 Development Notes

### **Mock vs Real Data**

The system supports both mock and real data:

**Mock Mode (Default):**
- No API key required
- Instant response
- Realistic random data
- Good for development/demo

**Real Mode:**
- Requires StormGlass API key
- Real-time weather data
- ML model predictions
- Production-ready

Toggle in `predict_service.py`:
```python
USE_MOCK_DATA = True  # Change to False for real data
```

### **Cache Strategy**

**Backend Cache:**
- Duration: 5 minutes
- Stores: Raw ML predictions
- Reason: Reduce Python spawn overhead

**Frontend Cache:**
- Duration: 10 minutes
- Stores: Enhanced spots with scores
- Reason: Offline support, faster loading

### **Performance Optimizations**

1. **Lazy ML Loading:** Model only loads when needed
2. **Parallel Processing:** Multiple spots processed concurrently
3. **Data Sanitization:** NaN/Infinity removed to prevent errors
4. **Connection Pooling:** MongoDB connections reused
5. **Compression:** GZIP responses
6. **Pagination:** Large lists paginated

### **Error Handling**

All components gracefully degrade:
- Backend works without MongoDB
- Frontend works without backend (cached data)
- ML predictions fallback to mock data
- Location services are optional

---

## 🎯 Key Innovations

1. **Multi-Factor Scoring:** 6 independent modules combine for accurate recommendations
2. **Adaptive Weights:** Different priorities for different skill levels
3. **Time-Aware:** Considers optimal surf windows
4. **Crowd Prediction:** Estimates lineup density
5. **Personalization:** Learns from user sessions
6. **Smart Recommendations:** Context-aware tips
7. **Offline Support:** Works without internet
8. **Graceful Degradation:** Optional components

---

## 📚 File Structure Summary

```
Surf-Ceylon/
├── README.md                    # Original README
├── readme2.md                   # This file (complete documentation)
│
├── surfapp--backend/           # Node.js Backend
│   ├── server.js               # Main server (378 lines)
│   ├── EnhancedSuitabilityCalculator.js  # Scoring engine (650 lines)
│   ├── routes/
│   │   ├── auth.js            # Authentication
│   │   ├── sessions.js        # Session tracking
│   │   └── personalization.js # ML personalization
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Session.js         # Session schema
│   ├── package.json
│   └── .env.example
│
├── surfapp--ml-engine/         # Python ML Engine
│   ├── surf_forecast_model.joblib        # Trained model (72 MB)
│   ├── preference_model.joblib           # Personalization model
│   ├── train_model.py                    # Training script (361 lines)
│   ├── train_personalization_model.py    # Personalization training (405 lines)
│   ├── predict_service.py                # Production inference (231 lines)
│   ├── collect_historical_data.py        # Data collection
│   ├── validate_features.py              # Feature analysis
│   ├── model_features.txt                # Feature list
│   ├── README_ML_MODEL.md               # ML documentation
│   ├── TRAINING_SUMMARY.md              # Training report
│   ├── requirements.txt
│   └── .env.example
│
└── SurfApp--frontend/          # React Native App
    ├── app/
    │   ├── _layout.js          # Navigation layout
    │   ├── index.js            # Home screen (313 lines)
    │   ├── login.js            # Login screen
    │   ├── register.js         # Registration
    │   ├── map.js              # Map view
    │   ├── profile.js          # User profile (376 lines)
    │   └── (spots)/
    │       ├── index.js        # Spots list
    │       └── [id].js         # Spot detail
    ├── components/
    │   ├── SpotCard.js         # Spot card component
    │   ├── ForecastChart.js    # Chart component
    │   ├── ScoreBreakdown.js   # Score visualization
    │   └── SuitabilityRadarChart.js
    ├── context/
    │   └── UserContext.js      # Global state
    ├── data/
    │   ├── surfApi.js          # API client (496 lines)
    │   ├── locationUtils.js    # GPS utilities
    │   ├── config.js           # Configuration
    │   └── mockData.js         # Mock data
    ├── package.json
    └── app.json
```

---

**Total Lines of Code:** ~15,000+  
**Languages:** JavaScript, Python, JSX  
**Architecture:** Microservices (Frontend → Backend → ML Engine → Database)  
**ML Models:** 2 (Forecast + Personalization)  
**API Endpoints:** 15+  
**Surf Spots:** 31 (across Sri Lanka)  
**UI Screens:** 8 major screens  
**Components:** 20+ reusable components

---

*Last Updated: November 25, 2025*  
*Version: 1.0.0*  
*Author: IT22003850*
