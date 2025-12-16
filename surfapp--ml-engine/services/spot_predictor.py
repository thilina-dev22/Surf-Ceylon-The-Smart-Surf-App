"""Spot Recommendation Service - Main Production Service"""
import sys
import json
import os
import pandas as pd
import numpy as np

# Import from organized modules
from config import (
    USE_MOCK_DATA,
    RANDOM_FOREST_BASE_FEATURES,
    RANDOM_FOREST_TARGETS
)
from models import load_random_forest_model, predict_with_random_forest
from utils import (
    fetch_weather_data_with_rotation,
    calculate_engineered_features,
    sanitize_prediction,
    generate_mock_spot_forecast
)

# --- Load Surf Spots ---
SURF_SPOTS = []
try:
    # Path from services/ to frontend: services -> ml-engine -> root -> frontend
    spots_file_path = os.path.join(os.path.dirname(__file__), '..', '..', 'SurfApp--frontend', 'data', 'surf_spots.json')
    with open(spots_file_path, 'r') as f:
        SURF_SPOTS = json.load(f)
    print(f"Loaded {len(SURF_SPOTS)} spots from shared JSON.", file=sys.stderr)
except Exception as e:
    print(f"Error loading shared spots JSON: {e}", file=sys.stderr)
    # Fallback to hardcoded if JSON load fails
    SURF_SPOTS = [
        {'id': '1', 'name': 'Weligama', 'region': 'South Coast', 'coords': [80.4264, 5.9721]},
        {'id': '13', 'name': 'Arugam Bay', 'region': 'East Coast', 'coords': [81.8293, 6.8434]}
    ]

# --- Load Model ---
SURF_PREDICTOR = load_random_forest_model()


def run_ml_prediction(features):
    """
    Run ML prediction with feature engineering.
    
    Args:
        features: Dictionary with 10 base weather features
    
    Returns:
        dict: Prediction with waveHeight, wavePeriod, windSpeed, windDirection, tide
    """
    try:
        if not SURF_PREDICTOR:
            raise ValueError("Model not loaded")
        
        # Create DataFrame from features
        input_df = pd.DataFrame([features])
        
        # Calculate 5 engineered features (CRITICAL: must match training)
        input_df = calculate_engineered_features(input_df)
        
        # Now we have 15 features (10 base + 5 engineered)
        predictions_array = predict_with_random_forest(input_df, model=SURF_PREDICTOR)
        predictions = dict(zip(RANDOM_FOREST_TARGETS, predictions_array[0]))
        
        # Extract tide status from sea level
        sea_level = float(features.get('seaLevel', 0.5))
        tide_status = 'High' if sea_level > 0.8 else ('Low' if sea_level < 0.3 else 'Mid')
        
        result = {
            'waveHeight': round(float(predictions.get('waveHeight', 1.0)), 1),
            'wavePeriod': round(float(predictions.get('wavePeriod', 10.0)), 1),
            'windSpeed': round(float(predictions.get('windSpeed', 15.0)) * 3.6, 1),  # m/s to km/h
            'windDirection': round(float(predictions.get('windDirection', 0)), 1),
            'tide': {'status': tide_status}
        }
        
        # Sanitize to remove NaN/Inf
        return sanitize_prediction(result)
        
    except Exception as e:
        print(f"Error in ML prediction: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        # Return safe default values
        return {
            'waveHeight': 1.0,
            'wavePeriod': 10.0,
            'windSpeed': 15.0,
            'windDirection': 0,
            'tide': {'status': 'Mid'}
        }


def get_spots_with_predictions():
    """
    Get all surf spots with forecast predictions.
    Main entry point for Node.js backend.
    
    Returns:
        list: All spots with forecast data
    """
    all_spots_data = []
    
    print(f"Processing {len(SURF_SPOTS)} surf spots...", file=sys.stderr)
    
    for i, spot in enumerate(SURF_SPOTS, 1):
        try:
            # Use mock data by default for performance (skip API calls)
            if USE_MOCK_DATA:
                forecast = generate_mock_spot_forecast(spot)
            else:
                # Fetch real API data
                lng, lat = spot['coords']
                features, is_valid = fetch_weather_data_with_rotation(
                    lat, lng,
                    hours_ahead=48,
                    feature_names=RANDOM_FOREST_BASE_FEATURES
                )
                
                if SURF_PREDICTOR and is_valid and features:
                    forecast = run_ml_prediction(features)
                else:
                    forecast = generate_mock_spot_forecast(spot)
            
            all_spots_data.append({**spot, 'forecast': forecast})
            
            if i % 10 == 0:
                print(f"Processed {i}/{len(SURF_SPOTS)} spots", file=sys.stderr)
                
        except Exception as e:
            print(f"Error processing spot {spot.get('name', 'unknown')}: {e}", file=sys.stderr)
            # Add spot with mock forecast even if there's an error
            all_spots_data.append({
                **spot,
                'forecast': generate_mock_spot_forecast(spot)
            })
    
    print(f"Successfully generated data for {len(all_spots_data)} spots", file=sys.stderr)
    return all_spots_data


def main():
    """CLI entry point - maintains backward compatibility"""
    try:
        spots = get_spots_with_predictions()
        # Backend expects { spots: [...] } structure
        output = {'spots': spots}
        print(json.dumps(output, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
