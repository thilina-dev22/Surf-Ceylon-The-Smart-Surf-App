import sys
import os
import json
import joblib
import pandas as pd
import requests
import arrow
import random
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
STORMGLASS_API_KEY = os.getenv("STORMGLASS_API_KEY")
MODEL_FILENAME = 'surf_forecast_model.joblib'
MODEL_PATH = os.path.join(os.path.dirname(__file__), MODEL_FILENAME)

# Validate API key on startup
if not STORMGLASS_API_KEY or STORMGLASS_API_KEY == 'your_api_key_here':
    print("Warning: STORMGLASS_API_KEY not configured. Will use mock data.", file=sys.stderr)

# --- Definitions (MUST MATCH train_model.py) ---
FEATURE_NAMES = [
    'swellHeight', 'swellPeriod', 'swellDirection', 'windSpeed',
    'windDirection', 'seaLevel', 'gust', 'secondarySwellHeight',
    'secondarySwellPeriod', 'secondarySwellDirection'
]
TARGET_NAMES = ['waveHeight', 'wavePeriod', 'windSpeed', 'windDirection']

# --- THIS IS THE FIX: 'coords' is now a simple flat array [lon, lat] ---
SURF_SPOTS = [
    {'id': '1', 'name': 'Arugam Bay', 'region': 'East Coast', 'coords': [81.829, 6.843]},
    {'id': '2', 'name': 'Weligama', 'region': 'South Coast', 'coords': [80.426, 5.972]},
    {'id': '3', 'name': 'Midigama', 'region': 'South Coast', 'coords': [80.383, 5.961]},
    {'id': '4', 'name': 'Hiriketiya', 'region': 'South Coast', 'coords': [80.686, 5.976]},
    {'id': '5', 'name': 'Okanda', 'region': 'East Coast', 'coords': [81.657, 6.660]},
]

# --- Model Loading ---
try:
    SURF_PREDICTOR = joblib.load(MODEL_PATH)
    print("Multi-output Random Forest Model loaded successfully.", file=sys.stderr)
except FileNotFoundError:
    SURF_PREDICTOR = None
    print(f"Warning: Model file not found at '{MODEL_PATH}'. Service will run in simulation mode.", file=sys.stderr)
except Exception as e:
    SURF_PREDICTOR = None
    print(f"Error loading model: {e}. Running in simulation mode.", file=sys.stderr)

def _get_average_from_sources(source_dict):
    """Calculate average from multiple weather data sources."""
    if not source_dict or not isinstance(source_dict, dict):
        return None
    valid_values = [v for v in source_dict.values() if isinstance(v, (int, float)) and not pd.isna(v)]
    return sum(valid_values) / len(valid_values) if valid_values else None

def fetch_future_weather_features(coords):
    """Fetch real-time weather data from Stormglass API."""
    if not STORMGLASS_API_KEY or STORMGLASS_API_KEY == 'your_api_key_here':
        print("API key is missing or invalid. Using mock data.", file=sys.stderr)
        return None, False

    if not coords or len(coords) != 2:
        print(f"Invalid coordinates: {coords}", file=sys.stderr)
        return None, False

    try:
        lon, lat = float(coords[0]), float(coords[1])
    except (ValueError, TypeError) as e:
        print(f"Error parsing coordinates: {e}", file=sys.stderr)
        return None, False

    start_time = arrow.utcnow()
    end_time = start_time.shift(hours=+1)
    
    try:
        response = requests.get(
            'https://api.stormglass.io/v2/weather/point',
            params={ 'lat': lat, 'lng': lon, 'params': ','.join(FEATURE_NAMES), 'start': start_time.timestamp(), 'end': end_time.timestamp() },
            headers={'Authorization': STORMGLASS_API_KEY}
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get('hours'): return None, False

        current_hour_data = data['hours'][0]
        features = {}
        is_data_valid = True
        for param in FEATURE_NAMES:
            value = _get_average_from_sources(current_hour_data.get(param, {}))
            if value is None:
                is_data_valid = False
            features[param] = value
        
        return features, is_data_valid
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}. Will use mock data.", file=sys.stderr)
        return None, False
    except Exception as e:
        print(f"Error processing weather data: {e}", file=sys.stderr)
        return None, False

def run_ml_prediction(features):
    """Run ML model prediction on weather features."""
    try:
        input_df = pd.DataFrame([features], columns=FEATURE_NAMES)
        predictions_array = SURF_PREDICTOR.predict(input_df)
        predictions = dict(zip(TARGET_NAMES, predictions_array[0]))
        
        sea_level = float(features.get('seaLevel', 0.5))
        tide_status = 'High' if sea_level > 0.8 else ('Low' if sea_level < 0.3 else 'Mid')
        
        return {
            'waveHeight': round(float(predictions.get('waveHeight', 1.0)), 1),
            'wavePeriod': round(float(predictions.get('wavePeriod', 10.0)), 1),
            'windSpeed': round(float(predictions.get('windSpeed', 15.0)) * 3.6, 1),  # m/s to km/h
            'windDirection': round(float(predictions.get('windDirection', 0)), 1),
            'tide': {'status': tide_status}
        }
    except Exception as e:
        print(f"Error in ML prediction: {e}", file=sys.stderr)
        # Return safe default values
        return {
            'waveHeight': 1.0,
            'wavePeriod': 10.0,
            'windSpeed': 15.0,
            'windDirection': 0,
            'tide': {'status': 'Mid'}
        }

def generate_mock_forecast(spot):
    """Generate realistic mock forecast data when API is unavailable."""
    print(f"Generating mock forecast for {spot['name']}.", file=sys.stderr)
    is_east_coast = spot.get('region', '') == 'East Coast'
    
    # More realistic ranges based on Sri Lankan surf conditions
    base_wave = 1.2 if is_east_coast else 1.0
    wave_variation = random.uniform(-0.4, 0.6)
    
    return {
        'waveHeight': round(max(0.3, base_wave + wave_variation), 1),
        'wavePeriod': round(random.uniform(8, 13), 1),
        'windSpeed': round(random.uniform(8, 25), 1),
        'windDirection': round(random.uniform(250, 290) if is_east_coast else random.uniform(330, 30), 1),
        'tide': {'status': random.choice(['Low', 'Mid', 'High'])}
    }

def get_spots_with_predictions():
    """Get all surf spots with forecast predictions."""
    all_spots_data = []
    
    for spot in SURF_SPOTS:
        try:
            features, is_valid = fetch_future_weather_features(spot['coords'])
            
            if SURF_PREDICTOR and is_valid and features:
                forecast = run_ml_prediction(features)
            else:
                forecast = generate_mock_forecast(spot)
            
            all_spots_data.append({**spot, 'forecast': forecast})
        except Exception as e:
            print(f"Error processing spot {spot.get('name', 'unknown')}: {e}", file=sys.stderr)
            # Add spot with mock forecast even if there's an error
            all_spots_data.append({
                **spot,
                'forecast': generate_mock_forecast(spot)
            })
        
    return all_spots_data

if __name__ == '__main__':
    try:
        results = get_spots_with_predictions()
        if not results:
            print(json.dumps({'error': 'No spots data generated'}), file=sys.stderr)
            sys.exit(1)
        print(json.dumps({'spots': results}))
        sys.exit(0)
    except Exception as e:
        print(f"Critical error in predict service: {e}", file=sys.stderr)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)