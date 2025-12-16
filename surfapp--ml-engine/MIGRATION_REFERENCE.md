# Quick Migration Reference

## Old vs New Code Locations

### API Keys (19 keys + rotation)
**Old:** `forecast_7day_service.py` lines 25-56  
**New:** `config/api_keys.py`

```python
# Old location
API_KEYS = [19 keys...]
current_api_key_index = 0

# New location
from config import get_next_api_key, rotate_to_next_key
```

---

### Model Paths
**Old:** Hardcoded in each service  
**New:** `config/model_paths.py`

```python
# Old
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'surf_forecast_model.joblib')
MODEL_FILE = 'wave_forecast_multioutput_lstm.keras'

# New
from config import RANDOM_FOREST_MODEL, LSTM_MODEL
```

---

### Feature Definitions
**Old:** Hardcoded in each service  
**New:** `config/features.py`

```python
# Old
FEATURE_NAMES = ['swellHeight', 'swellPeriod', ...]

# New
from config import RANDOM_FOREST_BASE_FEATURES, LSTM_FEATURE_COLUMNS
```

---

### Settings
**Old:** Scattered across files  
**New:** `config/settings.py`

```python
# Old
USE_MOCK_DATA = True
API_TIMEOUT = 10

# New
from config import USE_MOCK_DATA, API_TIMEOUT
```

---

### Random Forest Model Loading
**Old:** `spot_recommender_service.py` lines 47-63  
**New:** `models/random_forest.py`

```python
# Old
model_data = joblib.load(MODEL_PATH)
SURF_PREDICTOR = model_data['model']

# New
from models import load_random_forest_model
model = load_random_forest_model()
```

---

### LSTM Model Loading
**Old:** `forecast_7day_service.py` lines 68-95  
**New:** `models/lstm.py`

```python
# Old
model = keras.models.load_model(MODEL_FILE)
scaler_X = joblib.load(SCALER_X_FILE)
scaler_y = joblib.load(SCALER_Y_FILE)

# New
from models import load_lstm_model
model, scaler_x, scaler_y, feature_names = load_lstm_model()
```

---

### API Client (with key rotation)
**Old:** `forecast_7day_service.py` lines 100-190  
**New:** `utils/api_client.py`

```python
# Old
def fetch_recent_data_from_api(lat, lng, hours=168):
    # 90 lines of code...

# New
from utils import fetch_historical_data_with_rotation
data = fetch_historical_data_with_rotation(lat, lng, hours=168)
```

---

### Feature Engineering (CRITICAL)
**Old:** `spot_recommender_service.py` lines 130-144  
**New:** `utils/feature_engineering.py`

```python
# Old
input_df['swellEnergy'] = (input_df['swellHeight'] ** 2) * input_df['swellPeriod']
input_df['offshoreWind'] = input_df['windSpeed'] * np.cos(np.radians(input_df['windDirection'] - 270))
# ... 3 more features

# New
from utils import calculate_engineered_features
input_df = calculate_engineered_features(input_df)
```

---

### Data Processing
**Old:** `spot_recommender_service.py` lines 65-75  
**New:** `utils/data_processor.py`

```python
# Old
def _get_average_from_sources(source_dict):
    # ...

# New
from utils import get_average_from_sources, sanitize_prediction
```

---

### Mock Data Generation
**Old:** `spot_recommender_service.py` lines 162-220  
**New:** `utils/mock_data.py`

```python
# Old
def generate_mock_forecast(spot):
    # Region-based mock data...

# New
from utils import generate_mock_spot_forecast, generate_mock_timeseries_data
forecast = generate_mock_spot_forecast(spot_info)
```

---

### Date Utilities
**Old:** `forecast_7day_service.py` lines 480-495  
**New:** `utils/date_utils.py`

```python
# Old
date_labels = []
for i in range(7):
    if i == 0: label = "Today"
    elif i == 1: label = "Tmrw"
    # ...

# New
from utils import generate_date_labels, aggregate_hourly_to_daily
labels = generate_date_labels(days=7)
```

---

### Spot Recommendations Logic
**Old:** `spot_recommender_service.py` lines 1-233 (entire file)  
**New:** `services/spot_predictor.py`

```python
# Old (monolithic)
# Everything in one file...

# New (clean)
from services import get_spots_with_predictions, run_ml_prediction
spots = get_spots_with_predictions()
```

---

### 7-Day Forecast Logic
**Old:** `forecast_7day_service.py` lines 1-516 (entire file)  
**New:** `services/forecast_predictor.py`

```python
# Old (monolithic)
# Everything in one file...

# New (clean)
from services import predict_7day_forecast
hourly, daily, source, method = predict_7day_forecast(lat, lng)
```

---

## Import Patterns

### Config Layer
```python
from config import (
    get_next_api_key,
    rotate_to_next_key,
    RANDOM_FOREST_MODEL,
    LSTM_MODEL,
    RANDOM_FOREST_BASE_FEATURES,
    LSTM_FEATURE_COLUMNS,
    USE_MOCK_DATA,
    API_TIMEOUT
)
```

### Models Layer
```python
from models import (
    load_random_forest_model,
    predict_with_random_forest,
    load_lstm_model,
    predict_with_lstm
)
```

### Utils Layer
```python
from utils import (
    fetch_weather_data_with_rotation,
    fetch_historical_data_with_rotation,
    calculate_engineered_features,
    sanitize_prediction,
    generate_mock_spot_forecast,
    generate_mock_timeseries_data,
    generate_date_labels,
    aggregate_hourly_to_daily
)
```

### Services Layer
```python
from services import (
    get_spots_with_predictions,
    run_ml_prediction,
    predict_7day_forecast
)
```

---

## File Size Comparison

| File | Old Lines | New Lines | Reduction |
|------|-----------|-----------|-----------|
| spot_recommender_service.py | 233 | 20 | 91% |
| forecast_7day_service.py | 516 | 25 | 95% |
| **Total** | **749** | **45** | **94%** |

**But all logic preserved in organized modules:**
- config/ - 250 lines
- models/ - 180 lines
- utils/ - 350 lines
- services/ - 200 lines
- **Total organized:** 980 lines (vs 749 monolithic)

**Net result:** +231 lines BUT much better organized, reusable, testable.

---

## What to Do If Something Breaks

### Error: Module not found
```
ModuleNotFoundError: No module named 'config'
```
**Solution:** Check you're running from ml-engine root directory

### Error: Model not loading
```
❌ Random Forest Model not found
```
**Solution:** Check `config/model_paths.py` - ensure model files exist in root

### Error: Wrong predictions
```
Feature engineering mismatch
```
**Solution:** Don't modify `utils/feature_engineering.py` - formulas are CRITICAL

### Rollback Instructions
```bash
# Restore original files
cp spot_recommender_service_old.py spot_recommender_service.py
cp forecast_7day_service_old.py forecast_7day_service.py

# Delete new structure (optional)
rm -rf config/ models/ utils/ services/
```

---

## Benefits Summary

### Before
- ❌ 2 monolithic files (749 lines)
- ❌ Mixed concerns
- ❌ Duplicated code
- ❌ Hard to test
- ❌ Hard to maintain

### After
- ✅ 17 focused modules
- ✅ Clear separation of concerns
- ✅ No duplication
- ✅ Easy to test
- ✅ Easy to maintain
- ✅ Professional structure
- ✅ 100% backward compatible

---

## Quick Test Commands

```bash
# Test spot recommendations
python spot_recommender_service.py

# Test 7-day forecast
python forecast_7day_service.py 5.9721 80.4264

# Validate all files
python -m py_compile config/*.py models/*.py utils/*.py services/*.py *.py
```

---

## Key Takeaway

**Same functionality, better organization.**

The refactoring changed HOW the code is organized, not WHAT it does. All business logic, error handling, and ML accuracy are preserved.
