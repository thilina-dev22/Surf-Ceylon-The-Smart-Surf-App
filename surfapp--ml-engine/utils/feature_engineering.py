"""Feature Engineering Functions - CRITICAL: Must match training exactly"""
import numpy as np
import pandas as pd

def calculate_engineered_features(input_df):
    """
    Calculate 5 engineered features from base features.
    
    CRITICAL: These calculations MUST match the training pipeline exactly.
    Any deviation will cause ML model to produce incorrect predictions.
    
    Args:
        input_df: DataFrame with 10 base features from StormGlass API
                 ['swellHeight', 'swellPeriod', 'swellDirection', 'windSpeed',
                  'windDirection', 'seaLevel', 'gust', 'secondarySwellHeight',
                  'secondarySwellPeriod', 'secondarySwellDirection']
    
    Returns:
        DataFrame with 5 additional columns (15 total features)
    
    Engineered Features:
    1. swellEnergy = swellHeight² × swellPeriod (wave energy)
    2. offshoreWind = windSpeed × cos(windDirection - 270°) (offshore component for south coast)
    3. totalSwellHeight = swellHeight + secondarySwellHeight (combined swell)
    4. windSwellInteraction = windSpeed × swellHeight (wind impact on waves)
    5. periodRatio = swellPeriod / (secondarySwellPeriod + 1) (swell dominance)
    """
    # Make a copy to avoid modifying original
    df = input_df.copy()
    
    # 1. Swell energy (height² × period)
    df['swellEnergy'] = (df['swellHeight'] ** 2) * df['swellPeriod']
    
    # 2. Offshore wind factor (for south coast Sri Lanka, offshore ≈ 270°)
    df['offshoreWind'] = df['windSpeed'] * np.cos(np.radians(df['windDirection'] - 270))
    
    # 3. Combined swell height
    df['totalSwellHeight'] = df['swellHeight'] + df['secondarySwellHeight']
    
    # 4. Wind-swell interaction
    df['windSwellInteraction'] = df['windSpeed'] * df['swellHeight']
    
    # 5. Period ratio
    df['periodRatio'] = df['swellPeriod'] / (df['secondarySwellPeriod'] + 1)
    
    return df


def validate_features(features_dict, required_features):
    """
    Validate that all required features are present and numeric.
    
    Args:
        features_dict: Dictionary of features
        required_features: List of required feature names
    
    Returns:
        tuple: (is_valid, cleaned_features_dict)
    """
    cleaned = {}
    
    for feature in required_features:
        if feature not in features_dict:
            return False, None
        
        value = features_dict[feature]
        
        # Check if numeric
        try:
            numeric_value = float(value)
            if np.isnan(numeric_value) or np.isinf(numeric_value):
                return False, None
            cleaned[feature] = numeric_value
        except (ValueError, TypeError):
            return False, None
    
    return True, cleaned
