"""Mock Data Generation for Testing and Fallback"""
import random
import numpy as np

def generate_mock_spot_forecast(spot_info):
    """
    Generate realistic mock forecast for a single surf spot.
    Uses region-based patterns to match actual Sri Lankan surf conditions.
    
    Args:
        spot_info: Dictionary with 'name', 'region', 'coords' keys
    
    Returns:
        dict: Forecast with waveHeight, wavePeriod, windSpeed, windDirection, tide
    """
    region = spot_info.get('region', '')
    is_east_coast = region == 'East Coast'
    is_south_coast = region == 'South Coast'
    
    # Region-specific base conditions
    if is_east_coast:
        base_wave = 1.2
        wave_variation = random.uniform(-0.4, 0.6)
        wind_range = (8, 25)
        wind_dir_range = (250, 290)  # Westerly winds
    elif is_south_coast:
        base_wave = 1.0
        wave_variation = random.uniform(-0.3, 0.5)
        wind_range = (5, 20)
        wind_dir_range = (180, 220)  # South/SW winds
    else:
        # West coast or unknown
        base_wave = 0.8
        wave_variation = random.uniform(-0.2, 0.4)
        wind_range = (5, 18)
        wind_dir_range = (330, 30)  # NW/North winds
    
    return {
        'waveHeight': round(max(0.3, base_wave + wave_variation), 1),
        'wavePeriod': round(random.uniform(8, 13), 1),
        'windSpeed': round(random.uniform(*wind_range), 1),
        'windDirection': round(random.uniform(*wind_dir_range), 1),
        'tide': {'status': random.choice(['Low', 'Mid', 'High'])}
    }


def generate_mock_timeseries_data(lat, lng, hours=168):
    """
    Generate realistic mock historical time-series data for LSTM training/prediction.
    Uses location-based patterns and realistic cycles (daily, multi-day swells).
    
    Args:
        lat: Latitude
        lng: Longitude
        hours: Number of hours to generate (default 168 = 7 days)
    
    Returns:
        np.array: 2D array of shape (hours, 6) with features:
                  [waveHeight, wavePeriod, swellHeight, swellPeriod, windSpeed, windDirection]
    """
    # Determine region characteristics
    is_east_coast = lng > 81.0  # Arugam Bay region (east)
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
            max(0.3, base_wave + swell_cycle + daily_cycle + noise),  # waveHeight
            max(6.0, base_period + swell_cycle * 2 + random.uniform(-1, 1)),  # wavePeriod
            max(0.2, base_swell + swell_cycle + noise * 0.5),  # swellHeight
            max(8.0, base_swell_period + swell_cycle * 1.5 + random.uniform(-0.5, 0.5)),  # swellPeriod
            max(5.0, base_wind + wind_cycle + random.uniform(-2, 2)),  # windSpeed
            base_wind_dir + random.uniform(-15, 15)  # windDirection
        ])
    
    return np.array(data)


def generate_forecast_from_trend_extrapolation(recent_data, hours_ahead=168):
    """
    Generate future forecast from recent data using simple trend extrapolation.
    Used when LSTM model is not available.
    
    Args:
        recent_data: np.array of recent observations (shape: [time_steps, num_features])
        hours_ahead: Number of future hours to forecast
    
    Returns:
        np.array: Forecasted data (shape: [hours_ahead, num_features])
    """
    # Calculate recent trends
    last_24h = recent_data[-24:]
    last_48h = recent_data[-48:] if len(recent_data) >= 48 else recent_data
    
    # Calculate moving averages and trends
    avg_recent = last_24h.mean(axis=0)
    avg_older = last_48h[:min(24, len(last_48h))].mean(axis=0)
    trend = avg_recent - avg_older
    
    # Generate future hours with trend continuation
    forecast = []
    for hour in range(hours_ahead):
        # Gradually dampen the trend
        damping = np.exp(-hour / 72)  # Exponential decay over 3 days
        
        # Project forward with dampened trend
        daily_cycle = 0.1 * np.sin(2 * np.pi * hour / 24)
        
        # Base prediction with dampened trend
        prediction = avg_recent + trend * damping
        
        # Add realistic daily cycle
        prediction[0] += daily_cycle  # waveHeight
        prediction[4] += daily_cycle * 2  # windSpeed
        
        # Add small random variations
        noise = np.random.uniform(-0.05, 0.05, size=prediction.shape)
        prediction += noise
        
        # Ensure sensible bounds
        prediction = np.maximum(prediction, [0.3, 6.0, 0.2, 8.0, 5.0, 0.0])
        prediction = np.minimum(prediction, [5.0, 20.0, 4.0, 18.0, 40.0, 360.0])
        
        forecast.append(prediction)
    
    return np.array(forecast)
