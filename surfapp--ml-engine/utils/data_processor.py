"""Data Processing Utilities"""
import numpy as np

def get_average_from_sources(source_dict, default=0.0):
    """
    Extract numeric value from StormGlass API source dictionary.
    StormGlass returns data like: {'sg': 1.2, 'noaa': 1.3, 'icon': 1.1}
    
    Args:
        source_dict: Dictionary with source names as keys
        default: Default value if no valid sources found
    
    Returns:
        float: Average value from available sources, or default
    """
    if not isinstance(source_dict, dict):
        return default
    
    # Preferred sources in order (sg = StormGlass combined model)
    source_priority = ['sg', 'noaa', 'icon', 'meteo', 'fcoo', 'meto']
    
    values = []
    for source in source_priority:
        if source in source_dict:
            val = source_dict[source]
            if val is not None and not np.isnan(val):
                try:
                    values.append(float(val))
                except (ValueError, TypeError):
                    continue
    
    # If specific sources not found, try all keys
    if not values:
        for key, val in source_dict.items():
            if val is not None and not np.isnan(val):
                try:
                    values.append(float(val))
                except (ValueError, TypeError):
                    continue
    
    return np.mean(values) if values else default


def process_stormglass_api_response(api_response, feature_names):
    """
    Convert StormGlass API response to clean feature arrays.
    
    Args:
        api_response: Raw API response dictionary
        feature_names: List of feature names to extract
    
    Returns:
        np.array: 2D array of shape (time_steps, num_features)
    """
    hours = api_response.get('hours', [])
    
    if not hours:
        return None
    
    feature_data = []
    for hour in hours:
        row = []
        for feature in feature_names:
            value = get_average_from_sources(hour.get(feature, {}), default=0.0)
            row.append(value)
        feature_data.append(row)
    
    return np.array(feature_data)


def sanitize_prediction(prediction_dict):
    """
    Clean prediction dictionary by removing NaN/Infinity values.
    
    Args:
        prediction_dict: Dictionary of predicted values
    
    Returns:
        dict: Cleaned prediction dictionary with safe values
    """
    cleaned = {}
    
    for key, value in prediction_dict.items():
        if isinstance(value, (int, float)):
            if np.isnan(value) or np.isinf(value):
                # Use safe default values
                defaults = {
                    'waveHeight': 1.0,
                    'wavePeriod': 10.0,
                    'windSpeed': 15.0,
                    'windDirection': 180.0,
                    'swellHeight': 1.0,
                    'swellPeriod': 12.0,
                    'seaLevel': 0.5
                }
                cleaned[key] = defaults.get(key, 0.0)
            else:
                cleaned[key] = value
        else:
            cleaned[key] = value
    
    return cleaned
