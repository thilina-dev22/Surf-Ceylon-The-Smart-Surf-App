"""Feature Definitions for ML Models"""

# Model 1 (Random Forest) - 10 base weather parameters from StormGlass API
RANDOM_FOREST_BASE_FEATURES = [
    'swellHeight',           # Primary swell height (m)
    'swellPeriod',           # Primary swell period (s)
    'swellDirection',        # Primary swell direction (degrees)
    'windSpeed',             # Wind speed (m/s)
    'windDirection',         # Wind direction (degrees)
    'seaLevel',              # Sea level/tide (m)
    'gust',                  # Wind gust speed (m/s)
    'secondarySwellHeight',  # Secondary swell height (m)
    'secondarySwellPeriod',  # Secondary swell period (s)
    'secondarySwellDirection' # Secondary swell direction (degrees)
]

# Model 1 (Random Forest) - 5 engineered features (calculated from base features)
RANDOM_FOREST_ENGINEERED_FEATURES = [
    'swellEnergy',           # height² × period
    'offshoreWind',          # windSpeed × cos(windDir - 270°)
    'totalSwellHeight',      # primary + secondary swell
    'windSwellInteraction',  # windSpeed × swellHeight
    'periodRatio'            # swellPeriod / (secondaryPeriod + 1)
]

# Model 1 (Random Forest) - Total: 15 features (10 base + 5 engineered)
RANDOM_FOREST_ALL_FEATURES = RANDOM_FOREST_BASE_FEATURES + RANDOM_FOREST_ENGINEERED_FEATURES

# Model 1 (Random Forest) - 4 prediction targets
RANDOM_FOREST_TARGETS = [
    'waveHeight',      # Predicted wave height (m)
    'wavePeriod',      # Predicted wave period (s)
    'windSpeed',       # Predicted wind speed (m/s)
    'windDirection'    # Predicted wind direction (degrees)
]

# Model 2 (LSTM) - 6 time-series features for 7-day forecasts
LSTM_FEATURE_COLUMNS = [
    'waveHeight',
    'swellHeight',
    'swellPeriod',
    'windSpeed',
    'windDirection',
    'seaLevel'
]

# Model 2 (LSTM) - 6 multi-output predictions (same as input features)
LSTM_TARGET_COLUMNS = LSTM_FEATURE_COLUMNS

# Alias for backward compatibility
FEATURE_NAMES = RANDOM_FOREST_BASE_FEATURES
TARGET_NAMES = RANDOM_FOREST_TARGETS
FEATURE_COLS = LSTM_FEATURE_COLUMNS
