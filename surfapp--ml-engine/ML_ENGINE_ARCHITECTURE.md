# ML Engine Architecture Documentation

## Overview

The ML Engine has been restructured into a clean, modular architecture with clear separation of concerns. This improves maintainability, testability, and code reusability while maintaining 100% backward compatibility with the Node.js backend.

## Directory Structure

```
surfapp--ml-engine/
├── config/                    # Configuration Layer
│   ├── __init__.py
│   ├── api_keys.py           # 19 API keys + rotation logic
│   ├── model_paths.py        # Model file paths + validation
│   ├── features.py           # Feature definitions (15 RF, 6 LSTM)
│   └── settings.py           # General settings (USE_MOCK_DATA, timeouts)
│
├── models/                    # Model Layer
│   ├── __init__.py
│   ├── random_forest.py      # Random Forest wrapper (127MB)
│   └── lstm.py               # LSTM wrapper + scalers (164KB)
│
├── utils/                     # Utilities Layer
│   ├── __init__.py
│   ├── api_client.py         # StormGlass API client + key rotation
│   ├── data_processor.py     # Data cleaning + transformations
│   ├── feature_engineering.py # 5 engineered features (CRITICAL)
│   ├── mock_data.py          # Region-based mock data generation
│   └── date_utils.py         # Date labels + aggregation
│
├── services/                  # Services Layer
│   ├── __init__.py
│   ├── spot_predictor.py     # Main spot recommendation logic
│   └── forecast_predictor.py # Main 7-day forecast logic
│
├── training/                  # Training Scripts
│   ├── train_model.py
│   ├── train_wave_forecast_lstm.py
│   ├── train_with_local_data.py
│   ├── collect_historical_data.py
│   └── prepare_timeseries_data.py
│
├── testing/                   # Test Scripts
│   ├── test_model1.py
│   ├── test_wave_forecast.py
│   ├── validate_features.py
│   └── run_analysis.py
│
├── data/                      # Historical Data
│   ├── weligama_historical_data_fixed.json
│   ├── arugam_bay_historical_data_fixed.json
│   ├── timeseries_X_multioutput.npy
│   └── timeseries_y_multioutput.npy
│
├── artifacts/                 # Model Artifacts (or root - TBD)
│   ├── surf_forecast_model.joblib (127MB)
│   ├── wave_forecast_multioutput_lstm.keras
│   ├── wave_forecast_scaler_X_multioutput.joblib
│   ├── wave_forecast_scaler_y_multioutput.joblib
│   └── wave_forecast_feature_names.joblib
│
├── spot_recommender_service.py      # Main CLI (refactored - 20 lines)
├── forecast_7day_service.py         # Main CLI (refactored - 25 lines)
├── spot_recommender_service_old.py  # Backup (233 lines)
├── forecast_7day_service_old.py     # Backup (516 lines)
│
└── ML_ENGINE_ARCHITECTURE.md        # This file
```

## Layer Responsibilities

### 1. Config Layer (`config/`)

**Purpose:** Centralized configuration management

**Files:**
- `api_keys.py` - 19 StormGlass API keys, rotation logic, quota management
- `model_paths.py` - Model file paths, existence validation
- `features.py` - Feature definitions for both models (15 RF, 6 LSTM)
- `settings.py` - General settings (mock data toggle, timeouts, regions)

**Key Functions:**
- `get_next_api_key()` - Get current API key
- `rotate_to_next_key()` - Move to next key (called on 402/429 errors)
- `validate_model_exists()` - Check if model file exists

**Why Important:**
- Single source of truth for configuration
- Easy to change API keys or model paths
- Prevents hardcoding across multiple files

### 2. Models Layer (`models/`)

**Purpose:** ML model loading and prediction wrappers

**Files:**
- `random_forest.py` - Random Forest model (spot recommendations)
- `lstm.py` - LSTM model + scalers (7-day forecasts)

**Key Functions:**
- `load_random_forest_model()` - Load 127MB Random Forest model
- `predict_with_random_forest(features)` - Make prediction
- `load_lstm_model()` - Load LSTM + scalers (164KB total)
- `predict_with_lstm(timeseries)` - Predict 168 hours

**Why Important:**
- Handles model loading errors gracefully
- Caches loaded models (singleton pattern)
- Abstracts model-specific details

### 3. Utils Layer (`utils/`)

**Purpose:** Shared utility functions

**Files:**
- `api_client.py` - StormGlass API calls with 19-key rotation
- `data_processor.py` - Data extraction and cleaning
- `feature_engineering.py` - **CRITICAL** 5 engineered features
- `mock_data.py` - Region-based realistic mock data
- `date_utils.py` - Date label generation, daily aggregation

**Key Functions:**
- `fetch_weather_data_with_rotation()` - API call with key rotation
- `calculate_engineered_features()` - **MUST** match training exactly
- `generate_mock_timeseries_data()` - 168-hour mock data
- `generate_date_labels()` - ["Today", "Tmrw", "Mon", ...]

**Why Important:**
- Feature engineering is identical to training (critical for accuracy)
- API key rotation prevents quota exhaustion
- Realistic mock data for testing/fallback

### 4. Services Layer (`services/`)

**Purpose:** Main business logic and orchestration

**Files:**
- `spot_predictor.py` - Spot recommendation service
- `forecast_predictor.py` - 7-day forecast service

**Key Functions:**
- `get_spots_with_predictions()` - Process all 31 spots
- `run_ml_prediction(features)` - RF prediction with feature engineering
- `predict_7day_forecast(lat, lng)` - LSTM prediction with fallbacks

**Why Important:**
- Orchestrates all other layers
- Handles errors and fallbacks
- Main entry point for backend integration

## Feature Engineering (CRITICAL)

### Random Forest Model: 5 Engineered Features

These calculations **MUST** match the training pipeline exactly. Any deviation will cause incorrect predictions.

```python
# 1. Swell Energy
swellEnergy = swellHeight² × swellPeriod

# 2. Offshore Wind (South Coast Sri Lanka)
offshoreWind = windSpeed × cos(windDirection - 270°)

# 3. Total Swell Height
totalSwellHeight = swellHeight + secondarySwellHeight

# 4. Wind-Swell Interaction
windSwellInteraction = windSpeed × swellHeight

# 5. Period Ratio
periodRatio = swellPeriod / (secondarySwellPeriod + 1)
```

**Total Features:** 15 (10 base + 5 engineered)

**Location:** `utils/feature_engineering.py::calculate_engineered_features()`

## API Key Rotation

### The Problem
- StormGlass free tier: 10 requests/day per key
- 31 spots × 3 requests/spot = 93 requests minimum
- Single key would hit quota instantly

### The Solution
- 19 API keys in rotation
- 19 × 10 = 190 requests/day capacity
- Round-robin rotation after each successful request
- Immediate rotation on 402 (Payment Required) or 429 (Rate Limit)
- All 19 keys tried before returning error

### Implementation
```python
# config/api_keys.py
API_KEYS = [19 keys...]
current_api_key_index = 0

def get_next_api_key():
    return API_KEYS[current_api_key_index]

def rotate_to_next_key():
    global current_api_key_index
    current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
```

**Usage:**
```python
# utils/api_client.py
while keys_tried < total_keys:
    api_key = get_next_api_key()
    response = requests.get(url, headers={'Authorization': api_key})
    
    if response.status_code == 200:
        rotate_to_next_key()  # Success - move to next
        return data
    elif response.status_code in [402, 429]:
        rotate_to_next_key()  # Quota hit - try next
        keys_tried += 1
```

## Data Flow

### Spot Recommendations (Random Forest)

```
1. Backend calls: python spot_recommender_service.py

2. spot_recommender_service.py
   └── services/spot_predictor.py::main()

3. services/spot_predictor.py
   ├── Load 31 spots from shared JSON
   ├── Load Random Forest model (127MB)
   └── For each spot:
       ├── If USE_MOCK_DATA:
       │   └── utils/mock_data.py::generate_mock_spot_forecast()
       └── Else:
           ├── utils/api_client.py::fetch_weather_data_with_rotation()
           │   └── Try all 19 API keys until success
           ├── utils/feature_engineering.py::calculate_engineered_features()
           │   └── 5 engineered features (10 → 15 total)
           ├── models/random_forest.py::predict_with_random_forest()
           │   └── 4 outputs: waveHeight, wavePeriod, windSpeed, windDirection
           └── utils/data_processor.py::sanitize_prediction()

4. Output: JSON array of 31 spots with forecasts
```

### 7-Day Forecast (LSTM)

```
1. Backend calls: python forecast_7day_service.py <lat> <lng>

2. forecast_7day_service.py
   └── services/forecast_predictor.py::main()

3. services/forecast_predictor.py
   ├── Load LSTM model + scalers (164KB total)
   └── predict_7day_forecast(lat, lng):
       ├── Step 1: Fetch 168h historical data
       │   ├── utils/api_client.py::fetch_historical_data_with_rotation()
       │   │   └── Try all 19 API keys
       │   └── Fallback: utils/mock_data.py::generate_mock_timeseries_data()
       │
       ├── Step 2: Predict future 168 hours
       │   ├── models/lstm.py::predict_with_lstm()
       │   │   ├── Scale input (168, 6)
       │   │   ├── LSTM prediction
       │   │   └── Inverse scale output (168, 6)
       │   └── Fallback: utils/mock_data.py::generate_forecast_from_trend_extrapolation()
       │
       ├── Step 3: Format hourly data
       │   └── 168 hourly dictionaries
       │
       ├── Step 4: Aggregate to daily
       │   └── utils/date_utils.py::aggregate_hourly_to_daily()
       │       └── 7 daily averages
       │
       └── Step 5: Generate labels
           └── utils/date_utils.py::generate_date_labels()
               └── ["Today", "Tmrw", "Mon", ...]

4. Output: JSON with daily + hourly forecasts
```

## Migration Notes

### What Changed

**Before:**
- 2 monolithic files (233 + 516 = 749 lines)
- Mixed concerns (config, API, ML, data processing)
- Duplicated code (mock data, date utils)
- Hard to test individual components

**After:**
- Clean layered architecture (4 layers + 2 services)
- Single responsibility per module
- Reusable utilities
- Easy to test and maintain
- **Main files reduced to 20-25 lines** (96% reduction)

### What Stayed the Same

✅ **100% Backward Compatible:**
- CLI interface unchanged
- JSON output format identical
- Node.js backend integration works as-is
- All error handling preserved
- Feature engineering calculations identical

### Breaking Changes

❌ **None** - This is a pure refactoring with no API changes

## Testing

### Syntax Validation
```bash
# Test all Python files compile
python -m py_compile config/*.py
python -m py_compile models/*.py
python -m py_compile utils/*.py
python -m py_compile services/*.py
python -m py_compile *.py
```

### Integration Tests
```bash
# Test spot recommendations
python spot_recommender_service.py

# Test 7-day forecast (Weligama)
python forecast_7day_service.py 5.9721 80.4264

# Test 7-day forecast (Arugam Bay)
python forecast_7day_service.py 6.8434 81.8293
```

### Verify Outputs Match
1. Run old services (from backups)
2. Run new services
3. Compare JSON outputs (should be identical)

## Performance

### Model Loading (One-time)
- Random Forest: ~2 seconds (127MB)
- LSTM: ~3 seconds (model + 3 scalers)
- Cached in memory after first load

### API Calls
- With 19 keys: 190 requests/day capacity
- Rotation prevents quota exhaustion
- Timeout: 10 seconds per request

### Mock Data Mode
- Enabled by default (`USE_MOCK_DATA = True`)
- Process 31 spots in <1 second
- Uses region-based realistic patterns

## Benefits of New Architecture

### 1. Maintainability
- **Single Responsibility:** Each module has one clear purpose
- **Easy to Locate:** Feature engineering in one place, API calls in another
- **Documentation:** Clear structure with inline comments

### 2. Testability
- **Unit Tests:** Test each module independently
- **Mocking:** Easy to mock API calls, models, etc.
- **Isolation:** Test feature engineering without loading models

### 3. Reusability
- **Shared Utils:** date_utils used by both services
- **Config Reuse:** Same API keys for both services
- **Feature Engineering:** Guaranteed consistency

### 4. Scalability
- **Add Models:** New model? Add to `models/`
- **Add Features:** New feature? Add to `utils/`
- **Add Services:** New service? Add to `services/`

### 5. Debugging
- **Clear Stack Traces:** Know exactly which module failed
- **Isolated Issues:** API error? Check `api_client.py`
- **Logging:** Each module logs its operations

## Common Tasks

### Add a New API Key
```python
# config/api_keys.py
API_KEYS = [
    "existing-key-1",
    "existing-key-2",
    "NEW-KEY-HERE",  # ← Add here
]
```

### Change Model Path
```python
# config/model_paths.py
RANDOM_FOREST_MODEL = os.path.join(BASE_DIR, 'new_model_name.joblib')
```

### Add a New Feature
```python
# utils/feature_engineering.py
def calculate_engineered_features(input_df):
    # ... existing features ...
    
    # 6. New feature
    df['newFeature'] = df['someValue'] * df['anotherValue']
    
    return df
```

### Enable Real API Data
```python
# config/settings.py
USE_MOCK_DATA = False  # ← Change from True
```

### Add Custom Region
```python
# config/settings.py
REGIONS = {
    'New Region': {
        'offshore_wind_direction': 90,
        'seasonal_variation': 'moderate'
    }
}
```

## Troubleshooting

### Model Not Loading
```
❌ Random Forest Model not found at: /path/to/model.joblib
```
**Solution:** Check `config/model_paths.py` - ensure paths are correct

### All API Keys Exhausted
```
❌ All 19 API keys exhausted. Using mock data fallback.
```
**Solution:** 
1. Wait for quota reset (midnight UTC)
2. Add more API keys to `config/api_keys.py`
3. Enable mock data: `USE_MOCK_DATA = True`

### Feature Engineering Mismatch
```
Error: Model expected 15 features, got 10
```
**Solution:** Ensure `calculate_engineered_features()` is called before prediction

### Import Errors
```
ModuleNotFoundError: No module named 'config'
```
**Solution:** Ensure all `__init__.py` files exist in module directories

## Future Enhancements

### Potential Improvements
1. **Move to artifacts/:** Organize model files in dedicated folder
2. **Add Unit Tests:** Create `tests/` directory with pytest
3. **API Key Pool:** Database-backed key pool with health monitoring
4. **Caching Layer:** Redis cache for API responses
5. **Async Processing:** Use asyncio for parallel API calls
6. **Model Versioning:** Track model versions in metadata
7. **A/B Testing:** Compare multiple model versions
8. **Monitoring:** Prometheus metrics for API success rates

### Easy Wins
- ✅ Add type hints to all functions
- ✅ Create requirements.txt with pinned versions
- ✅ Add docstrings to all public functions (mostly done)
- ✅ Create CI/CD pipeline for testing
- ✅ Add pre-commit hooks for linting

## Summary

**Before:** 2 monolithic files, 749 lines, mixed concerns  
**After:** 8 modules, 4 layers, clear separation, 96% size reduction in main files

**Key Achievement:** Maintained 100% backward compatibility while achieving professional architecture.

**Critical Components:**
- 19 API keys with intelligent rotation
- Feature engineering matching training exactly
- Comprehensive error handling and fallbacks
- Region-based realistic mock data

**Result:** Clean, maintainable, testable, and production-ready ML engine.
