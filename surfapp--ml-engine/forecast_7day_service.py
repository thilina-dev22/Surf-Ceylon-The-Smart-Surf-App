"""
Generate comprehensive 7-day surf forecasts using trained LSTM model
Outputs: Wave Height, Wave Period, Swell Height, Swell Period, Wind Speed, Wind Direction

With intelligent fallback to realistic mock data when:
- StormGlass API is unavailable
- API quota exceeded
- Model not trained yet
"""
import sys
import json
import numpy as np
import os
import random
from datetime import datetime, timedelta, timezone

# Try to load dotenv (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv not installed. Using environment variables directly.", file=sys.stderr)

# Multiple API keys for rotation (19 free-tier keys with 10 requests/day each)
API_KEYS = [
    "2b9c359a-a5a8-11f0-8208-0242ac130006-2b9c3630-a5a8-11f0-8208-0242ac130006",
    "af1036a4-a5be-11f0-8208-0242ac130006-af10371c-a5be-11f0-8208-0242ac130006",
    "a3cc1756-a5c1-11f0-b808-0242ac130006-a3cc17ba-a5c1-11f0-b808-0242ac130006",
    "2c822782-a5c4-11f0-9727-0242ac130006-2c8227e6-a5c4-11f0-9727-0242ac130006",
    "68a5ab3a-a66e-11f0-a2a5-0242ac130006-68a5ac02-a66e-11f0-a2a5-0242ac130006",
    "943fd418-a679-11f0-a2a5-0242ac130006-943fd490-a679-11f0-a2a5-0242ac130006",
    "bb8f7ae8-c5cb-11f0-a8f4-0242ac130003-bb8f7b42-c5cb-11f0-a8f4-0242ac130003",
    "204f4594-c5cc-11f0-b4de-0242ac130003-204f463e-c5cc-11f0-b4de-0242ac130003",
    "3fd3b6ca-c5cc-11f0-b4de-0242ac130003-3fd3b72e-c5cc-11f0-b4de-0242ac130003",
    "fe940b6e-c5cc-11f0-bd1c-0242ac130003-fe940bfa-c5cc-11f0-bd1c-0242ac130003",
    "24c61764-c5cd-11f0-a8f4-0242ac130003-24c617f0-c5cd-11f0-a8f4-0242ac130003",
    "5c476b8e-c5cd-11f0-b5c3-0242ac130003-5c476c1a-c5cd-11f0-b5c3-0242ac130003",
    "7d79cf90-c5cd-11f0-b5c3-0242ac130003-7d79d328-c5cd-11f0-b5c3-0242ac130003",
    "9dc164de-c5cd-11f0-b5c3-0242ac130003-9dc16542-c5cd-11f0-b5c3-0242ac130003",
    "ee8d38a2-c5cd-11f0-a0d3-0242ac130003-ee8d391a-c5cd-11f0-a0d3-0242ac130003",
    "20a872ca-c5ce-11f0-a8f4-0242ac130003-20a87356-c5ce-11f0-a8f4-0242ac130003",
    "57df12bc-c5ce-11f0-b4de-0242ac130003-57df1334-c5ce-11f0-b4de-0242ac130003",
    "7b33f174-c5ce-11f0-a0d3-0242ac130003-7b33f200-c5ce-11f0-a0d3-0242ac130003",
    "964936d6-c5ce-11f0-a148-0242ac130003-9649376c-c5ce-11f0-a148-0242ac130003"
]

# Global index to track which API key to use next (rotates through all keys)
current_api_key_index = 0

# Legacy support: check .env file for single key (will be added to rotation)
STORMGLASS_API_KEY = os.getenv("STORMGLASS_API_KEY")
if STORMGLASS_API_KEY and STORMGLASS_API_KEY != 'your_api_key_here':
    # Add .env key to rotation if not already present
    if STORMGLASS_API_KEY not in API_KEYS:
        API_KEYS.insert(0, STORMGLASS_API_KEY)

# Model files
MODEL_FILE = 'wave_forecast_multioutput_lstm.keras'
SCALER_X_FILE = 'wave_forecast_scaler_X_multioutput.joblib'
SCALER_Y_FILE = 'wave_forecast_scaler_y_multioutput.joblib'
FEATURE_NAMES_FILE = 'wave_forecast_feature_names.joblib'

# Feature columns (must match training)
FEATURE_COLS = ['waveHeight', 'wavePeriod', 'swellHeight', 
                'swellPeriod', 'windSpeed', 'windDirection']

# Try to load TensorFlow and model
MODEL_AVAILABLE = False
TF_AVAILABLE = False

try:
    import tensorflow as tf
    TF_AVAILABLE = True
    
    if os.path.exists(MODEL_FILE):
        # Load native .keras format model (no custom_objects needed)
        model = tf.keras.models.load_model(MODEL_FILE)
        
        import joblib
        scaler_X = joblib.load(SCALER_X_FILE)
        scaler_y = joblib.load(SCALER_Y_FILE)
        MODEL_AVAILABLE = True
        print("✅ LSTM forecast model loaded successfully", file=sys.stderr)
    else:
        print(f"⚠️  Model file {MODEL_FILE} not found. Using mock data.", file=sys.stderr)
except ImportError:
    print("⚠️  TensorFlow not installed. Using mock data mode.", file=sys.stderr)
except Exception as e:
    print(f"⚠️  Error loading model: {e}. Using mock data.", file=sys.stderr)

# Try to import requests for API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    print("⚠️  requests library not installed. Using mock data mode.", file=sys.stderr)
    REQUESTS_AVAILABLE = False


def fetch_recent_data_from_api(lat, lng, hours=168):
    """
    Fetch past N hours of data from StormGlass API with intelligent key rotation
    Tries all 19 API keys in sequence until one succeeds
    Returns None if all API keys fail (to trigger mock data fallback)
    """
    global current_api_key_index
    
    if not REQUESTS_AVAILABLE:
        print("  requests library not available", file=sys.stderr)
        return None
    
    if not API_KEYS or len(API_KEYS) == 0:
        print("  No API keys configured", file=sys.stderr)
        return None
    
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours)
    
    url = "https://api.stormglass.io/v2/weather/point"
    params = {
        'lat': lat,
        'lng': lng,
        'start': int(start_time.timestamp()),
        'end': int(end_time.timestamp()),
        'params': ','.join(FEATURE_COLS)
    }
    
    # Try all API keys in rotation
    keys_tried = 0
    max_keys_to_try = len(API_KEYS)
    
    while keys_tried < max_keys_to_try:
        # Get current API key
        api_key = API_KEYS[current_api_key_index]
        key_number = current_api_key_index + 1
        
        headers = {'Authorization': api_key}
        
        try:
            print(f"  Fetching {hours}h of data using API Key #{key_number}/{len(API_KEYS)}...", file=sys.stderr)
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                print(f"  ✅ Success with API Key #{key_number}", file=sys.stderr)
                data = response.json()
                # Advance to next key for future requests (round-robin)
                current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
                return process_stormglass_data(data)
            
            elif response.status_code == 402:
                print(f"  ⚠️  API Key #{key_number}: Payment Required (402). Trying next key...", file=sys.stderr)
                # Move to next key immediately
                current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
                keys_tried += 1
                continue
                
            elif response.status_code == 429:
                print(f"  ⚠️  API Key #{key_number}: Rate limit exceeded (429). Trying next key...", file=sys.stderr)
                # Move to next key immediately
                current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
                keys_tried += 1
                continue
            
            else:
                print(f"  ⚠️  API Key #{key_number}: Error {response.status_code}. Trying next key...", file=sys.stderr)
                current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
                keys_tried += 1
                continue
                
        except requests.exceptions.Timeout:
            print(f"  ⚠️  API Key #{key_number}: Timeout. Trying next key...", file=sys.stderr)
            current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
            keys_tried += 1
            continue
            
        except requests.exceptions.RequestException as e:
            print(f"  ⚠️  API Key #{key_number}: Request failed ({e}). Trying next key...", file=sys.stderr)
            current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
            keys_tried += 1
            continue
            
        except Exception as e:
            print(f"  ⚠️  API Key #{key_number}: Unexpected error ({e}). Trying next key...", file=sys.stderr)
            current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
            keys_tried += 1
            continue
    
    # All keys exhausted
    print(f"  ❌ All {len(API_KEYS)} API keys exhausted. Using mock data fallback.", file=sys.stderr)
    return None


def process_stormglass_data(api_response):
    """Convert API response to model input format"""
    hours = api_response.get('hours', [])
    
    if not hours:
        return None
    
    features = []
    for hour in hours:
        features.append([
            _get_value(hour.get('waveHeight', {}), 1.0),
            _get_value(hour.get('wavePeriod', {}), 10.0),
            _get_value(hour.get('swellHeight', {}), 1.0),
            _get_value(hour.get('swellPeriod', {}), 12.0),
            _get_value(hour.get('windSpeed', {}), 15.0),
            _get_value(hour.get('windDirection', {}), 180.0)
        ])
    
    return np.array(features)


def _get_value(source_dict, default):
    """Extract value from StormGlass source dict"""
    if not isinstance(source_dict, dict):
        return default
    
    # Try different sources in order of preference
    for source in ['sg', 'noaa', 'icon', 'meteo']:
        if source in source_dict:
            val = source_dict[source]
            if val is not None and not np.isnan(val):
                return float(val)
    
    return default


def generate_realistic_mock_data(lat, lng, hours=168):
    """
    Generate realistic mock historical data based on location
    Uses same approach as spot_recommender_service.py
    """
    print(f"  Generating realistic mock data for ({lat:.3f}, {lng:.3f})...", file=sys.stderr)
    
    # Determine region characteristics
    is_east_coast = lng > 81.0  # Arugam Bay region
    is_south_coast = lat < 6.5 and lng < 81.0  # Weligama/South coast
    
    # Base conditions per region
    if is_east_coast:
        base_wave = 1.3
        base_period = 11.0
        base_swell = 1.1
        base_swell_period = 12.5
        base_wind = 16.0
        base_wind_dir = 270.0  # Westerly
    elif is_south_coast:
        base_wave = 1.1
        base_period = 10.0
        base_swell = 0.9
        base_swell_period = 12.0
        base_wind = 14.0
        base_wind_dir = 200.0  # SW
    else:
        # Default/West coast
        base_wave = 0.9
        base_period = 9.5
        base_swell = 0.7
        base_swell_period = 11.0
        base_wind = 12.0
        base_wind_dir = 180.0
    
    # Generate realistic time-series with trends and cycles
    data = []
    
    # Create a realistic trend (simulating swell cycle)
    trend_period = 72  # 3-day cycle
    
    for hour in range(hours):
        # Daily cycle (stronger in afternoon)
        daily_cycle = 0.1 * np.sin(2 * np.pi * hour / 24)
        
        # Multi-day swell cycle
        swell_cycle = 0.3 * np.sin(2 * np.pi * hour / trend_period)
        
        # Random variation
        noise = random.uniform(-0.15, 0.15)
        
        # Wind varies with time of day (stronger in afternoon)
        wind_cycle = 3.0 * (0.5 + 0.5 * np.sin(2 * np.pi * (hour - 6) / 24))
        
        data.append([
            max(0.3, base_wave + swell_cycle + daily_cycle + noise),
            max(6.0, base_period + swell_cycle * 2 + random.uniform(-1, 1)),
            max(0.2, base_swell + swell_cycle + noise * 0.5),
            max(8.0, base_swell_period + swell_cycle * 1.5 + random.uniform(-0.5, 0.5)),
            max(5.0, base_wind + wind_cycle + random.uniform(-2, 2)),
            base_wind_dir + random.uniform(-15, 15)  # Wind direction varies
        ])
    
    return np.array(data)


def predict_with_lstm(recent_data):
    """Use LSTM model to predict future 7 days"""
    if not MODEL_AVAILABLE:
        return None
    
    try:
        # Ensure exactly 168 timesteps
        if len(recent_data) > 168:
            recent_data = recent_data[-168:]
        elif len(recent_data) < 168:
            padding = np.repeat(recent_data[-1:], 168 - len(recent_data), axis=0)
            recent_data = np.vstack([recent_data, padding])
        
        # Scale input
        X_scaled = scaler_X.transform(recent_data)
        X_input = X_scaled.reshape(1, 168, 6)
        
        # Predict (168 hours, 6 features)
        print("  Running LSTM prediction...", file=sys.stderr)
        y_pred_scaled = model.predict(X_input, verbose=0)
        
        # Inverse transform to get real values
        y_pred_flat = y_pred_scaled.reshape(-1, 6)
        y_pred = scaler_y.inverse_transform(y_pred_flat).reshape(168, 6)
        
        return y_pred
        
    except Exception as e:
        print(f"  LSTM prediction failed: {e}", file=sys.stderr)
        return None


def generate_mock_forecast_from_recent(recent_data):
    """
    Generate future forecast from recent data using simple extrapolation
    This is used when LSTM model is not available
    """
    print("  Generating forecast using trend extrapolation...", file=sys.stderr)
    
    # Calculate recent trends
    last_24h = recent_data[-24:]
    last_48h = recent_data[-48:]
    
    # Calculate moving averages and trends
    avg_recent = last_24h.mean(axis=0)
    avg_older = last_48h[:24].mean(axis=0)
    trend = avg_recent - avg_older
    
    # Generate 168 future hours with trend continuation
    forecast = []
    for hour in range(168):
        # Gradually dampen the trend
        damping = np.exp(-hour / 72)  # Exponential decay
        
        # Project forward with dampened trend
        daily_cycle = 0.1 * np.sin(2 * np.pi * hour / 24)
        predicted = avg_recent + trend * damping + daily_cycle * avg_recent * 0.1
        
        # Add small random variation
        noise = np.random.normal(0, 0.05, 6)
        predicted += noise * avg_recent
        
        # Ensure realistic bounds
        predicted[0] = max(0.3, min(5.0, predicted[0]))  # Wave height
        predicted[1] = max(6.0, min(20.0, predicted[1]))  # Wave period
        predicted[2] = max(0.2, min(4.0, predicted[2]))  # Swell height
        predicted[3] = max(8.0, min(25.0, predicted[3]))  # Swell period
        predicted[4] = max(5.0, min(35.0, predicted[4]))  # Wind speed
        predicted[5] = predicted[5] % 360  # Wind direction (0-360)
        
        forecast.append(predicted)
    
    return np.array(forecast)


def aggregate_to_daily(hourly_forecast):
    """Convert 168 hourly predictions to 7 daily averages and return both"""
    daily_forecasts = {}
    hourly_forecasts = []
    
    # Generate hourly forecasts with timestamps
    for hour_idx in range(168):
        hourly_forecasts.append({
            'hour': hour_idx,
            'day': hour_idx // 24,
            'hourOfDay': hour_idx % 24,
            'waveHeight': round(float(hourly_forecast[hour_idx, 0]), 2),
            'wavePeriod': round(float(hourly_forecast[hour_idx, 1]), 1),
            'swellHeight': round(float(hourly_forecast[hour_idx, 2]), 2),
            'swellPeriod': round(float(hourly_forecast[hour_idx, 3]), 1),
            'windSpeed': round(float(hourly_forecast[hour_idx, 4]), 1),
            'windDirection': round(float(hourly_forecast[hour_idx, 5]), 0)
        })
    
    # Generate daily aggregates
    for day in range(7):
        start_hour = day * 24
        end_hour = start_hour + 24
        day_data = hourly_forecast[start_hour:end_hour]
        
        daily_forecasts[day] = {
            'waveHeight': round(float(day_data[:, 0].mean()), 2),
            'wavePeriod': round(float(day_data[:, 1].mean()), 1),
            'swellHeight': round(float(day_data[:, 2].mean()), 2),
            'swellPeriod': round(float(day_data[:, 3].mean()), 1),
            'windSpeed': round(float(day_data[:, 4].mean()), 1),
            'windDirection': round(float(day_data[:, 5].mean()), 0)
        }
    
    return daily_forecasts, hourly_forecasts


def predict_7day_forecast(lat, lng):
    """
    Main forecasting function with multi-level fallback:
    1. Try LSTM model with real API data
    2. Try LSTM model with mock historical data
    3. Use trend extrapolation with mock data
    4. Use pure mock data
    """
    print(f"\n🌊 Generating 7-day forecast for ({lat}, {lng})", file=sys.stderr)
    
    # Step 1: Try to fetch real data from API
    recent_data = fetch_recent_data_from_api(lat, lng)
    data_source = "API"
    
    # Step 2: If API fails, generate realistic mock historical data
    if recent_data is None or len(recent_data) < 168:
        print("  ℹ️  Using mock historical data", file=sys.stderr)
        recent_data = generate_realistic_mock_data(lat, lng, hours=168)
        data_source = "Mock"
    
    # Step 3: Try LSTM prediction
    forecast_hourly = predict_with_lstm(recent_data)
    forecast_method = "LSTM"
    
    # Step 4: If LSTM fails, use trend extrapolation
    if forecast_hourly is None:
        forecast_hourly = generate_mock_forecast_from_recent(recent_data)
        forecast_method = "Trend"
    
    # Step 5: Aggregate to daily forecasts and prepare hourly data
    daily_forecasts, hourly_forecasts = aggregate_to_daily(forecast_hourly)
    
    print(f"  ✅ Forecast generated (Data: {data_source}, Method: {forecast_method})", 
          file=sys.stderr)
    
    return daily_forecasts, hourly_forecasts, data_source, forecast_method


def main():
    """Main entry point"""
    # Parse command-line arguments
    if len(sys.argv) > 2:
        try:
            lat = float(sys.argv[1])
            lng = float(sys.argv[2])
        except ValueError:
            print(json.dumps({
                'error': 'Invalid coordinates. Usage: python forecast_7day_service.py <lat> <lng>'
            }))
            sys.exit(1)
    else:
        # Default: Weligama
        lat = 5.972
        lng = 80.426
    
    # Generate forecast
    try:
        daily_forecast, hourly_forecast, data_source, method = predict_7day_forecast(lat, lng)
        
        # Generate date labels starting from today
        today = datetime.now(timezone.utc)
        date_labels = []
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        for i in range(7):
            forecast_date = today + timedelta(days=i)
            day_name = day_names[forecast_date.weekday()]
            if i == 0:
                label = "Today"
            elif i == 1:
                label = "Tmrw"
            else:
                label = day_name
            date_labels.append(label)
        
        # Format output
        result = {
            'location': {'lat': lat, 'lng': lng},
            'labels': date_labels,
            'daily': {
                'waveHeight': [daily_forecast[d]['waveHeight'] for d in range(7)],
                'wavePeriod': [daily_forecast[d]['wavePeriod'] for d in range(7)],
                'swellHeight': [daily_forecast[d]['swellHeight'] for d in range(7)],
                'swellPeriod': [daily_forecast[d]['swellPeriod'] for d in range(7)],
                'windSpeed': [daily_forecast[d]['windSpeed'] for d in range(7)],
                'windDirection': [daily_forecast[d]['windDirection'] for d in range(7)]
            },
            'hourly': hourly_forecast,
            'metadata': {
                'dataSource': data_source,
                'forecastMethod': method,
                'generatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'totalHours': len(hourly_forecast)
            }
        }
        
        # Output JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({
            'error': f'Forecast generation failed: {str(e)}',
            'location': {'lat': lat, 'lng': lng}
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
