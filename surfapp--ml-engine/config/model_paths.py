"""Model File Paths and Validation"""
import os
import sys

# Get base directory (ml-engine root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Model 1: Random Forest (for spot recommendations)
RANDOM_FOREST_MODEL = os.path.join(BASE_DIR, 'surf_forecast_model.joblib')

# Model 2: LSTM (for 7-day forecasts)
LSTM_MODEL = os.path.join(BASE_DIR, 'wave_forecast_multioutput_lstm.keras')
LSTM_SCALER_X = os.path.join(BASE_DIR, 'wave_forecast_scaler_X_multioutput.joblib')
LSTM_SCALER_Y = os.path.join(BASE_DIR, 'wave_forecast_scaler_y_multioutput.joblib')
LSTM_FEATURE_NAMES = os.path.join(BASE_DIR, 'wave_forecast_feature_names.joblib')

# Artifacts directory for organized storage
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

def validate_model_exists(model_path, model_name):
    """
    Check if model file exists and warn if not found.
    Args:
        model_path: Path to model file
        model_name: Human-readable model name for logging
    Returns:
        bool: True if exists, False otherwise
    """
    if not os.path.exists(model_path):
        print(f"⚠️  {model_name} not found at: {model_path}", file=sys.stderr)
        return False
    return True

def get_model_info():
    """Get information about all models"""
    return {
        'random_forest': {
            'path': RANDOM_FOREST_MODEL,
            'exists': os.path.exists(RANDOM_FOREST_MODEL),
            'size_mb': os.path.getsize(RANDOM_FOREST_MODEL) / (1024*1024) if os.path.exists(RANDOM_FOREST_MODEL) else 0
        },
        'lstm': {
            'path': LSTM_MODEL,
            'exists': os.path.exists(LSTM_MODEL),
            'size_mb': os.path.getsize(LSTM_MODEL) / (1024*1024) if os.path.exists(LSTM_MODEL) else 0
        }
    }
