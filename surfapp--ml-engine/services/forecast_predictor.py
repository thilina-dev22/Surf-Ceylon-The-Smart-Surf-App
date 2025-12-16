"""7-Day Forecast Service - Main Production Service"""
import sys
import json
import numpy as np
from datetime import datetime, timedelta, timezone

# Import from organized modules
from config import LSTM_FEATURE_COLUMNS
from models import load_lstm_model, predict_with_lstm
from utils import (
    fetch_historical_data_with_rotation,
    generate_mock_timeseries_data,
    generate_forecast_from_trend_extrapolation,
    generate_date_labels,
    aggregate_hourly_to_daily,
    get_current_timestamp_iso
)

# --- Load LSTM Model ---
lstm_model, scaler_x, scaler_y, feature_names = load_lstm_model()
MODEL_AVAILABLE = (lstm_model is not None and scaler_x is not None and scaler_y is not None)


def predict_7day_forecast(lat, lng):
    """
    Generate 7-day (168 hour) forecast for a location.
    
    Args:
        lat: Latitude
        lng: Longitude
    
    Returns:
        tuple: (hourly_forecast, daily_forecast, data_source, method)
               hourly_forecast: List of 168 hourly dictionaries
               daily_forecast: List of 7 daily dictionaries
               data_source: 'api' or 'mock'
               method: 'lstm' or 'extrapolation' or 'mock'
    """
    print(f"\\n🌊 Generating 7-day forecast for ({lat:.3f}, {lng:.3f})...", file=sys.stderr)
    
    # Step 1: Try to fetch real historical data (168 hours)
    recent_data = fetch_historical_data_with_rotation(
        lat, lng,
        hours=168,
        feature_names=LSTM_FEATURE_COLUMNS
    )
    
    # Step 2: Fallback to mock data if API fails
    if recent_data is None:
        print("  Using mock historical data...", file=sys.stderr)
        recent_data = generate_mock_timeseries_data(lat, lng, hours=168)
        data_source = 'mock'
    else:
        data_source = 'api'
        print(f"  Got {len(recent_data)} hours of historical data from API", file=sys.stderr)
    
    # Step 3: Predict future 168 hours
    if MODEL_AVAILABLE:
        # Try LSTM prediction
        future_prediction = predict_with_lstm(
            recent_data,
            model=lstm_model,
            scaler_x=scaler_x,
            scaler_y=scaler_y
        )
        
        if future_prediction is not None:
            method = 'lstm'
            print("  ✅ LSTM prediction successful", file=sys.stderr)
        else:
            # Fallback to extrapolation
            method = 'extrapolation'
            print("  Using trend extrapolation...", file=sys.stderr)
            future_prediction = generate_forecast_from_trend_extrapolation(recent_data, hours_ahead=168)
    else:
        # No model available, use extrapolation
        method = 'extrapolation'
        print("  Using trend extrapolation (LSTM not available)...", file=sys.stderr)
        future_prediction = generate_forecast_from_trend_extrapolation(recent_data, hours_ahead=168)
    
    # Step 4: Convert predictions to structured format
    hourly_forecast = []
    for hour_idx in range(168):
        hour_data = future_prediction[hour_idx]
        day = hour_idx // 24  # 0-6 for 7 days
        hour_of_day = hour_idx % 24  # 0-23 for hours
        
        hourly_forecast.append({
            'hour': hour_idx,
            'day': day,
            'hourOfDay': hour_of_day,
            'waveHeight': round(float(hour_data[0]), 1),
            'wavePeriod': round(float(hour_data[1]), 1),
            'swellHeight': round(float(hour_data[2]), 1),
            'swellPeriod': round(float(hour_data[3]), 1),
            'windSpeed': round(float(hour_data[4]), 1),
            'windDirection': round(float(hour_data[5]), 1)
        })
    
    # Step 5: Aggregate to daily averages
    daily_forecast = aggregate_hourly_to_daily(hourly_forecast, hours_per_day=24)
    
    return hourly_forecast, daily_forecast, data_source, method


def main():
    """CLI entry point - maintains backward compatibility"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python forecast_7day_service.py <lat> <lng>'
        }), file=sys.stderr)
        sys.exit(1)
    
    try:
        lat = float(sys.argv[1])
        lng = float(sys.argv[2])
        
        # Generate forecast
        hourly_forecast, daily_forecast, data_source, method = predict_7day_forecast(lat, lng)
        
        # Generate date labels
        date_labels = generate_date_labels(days=7)
        
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
                'generatedAt': get_current_timestamp_iso(),
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
