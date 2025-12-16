"""LSTM Model Wrapper"""
import sys
import os
import numpy as np
from config import (
    LSTM_MODEL,
    LSTM_SCALER_X,
    LSTM_SCALER_Y,
    LSTM_FEATURE_NAMES,
    validate_model_exists
)

# Try to import TensorFlow/Keras
try:
    from tensorflow import keras
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False
    print("Warning: TensorFlow/Keras not available. LSTM model cannot be loaded.", file=sys.stderr)

# Try to import joblib for scalers
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False
    print("Warning: joblib not available. LSTM scalers cannot be loaded.", file=sys.stderr)

# Global model and scaler instances
_lstm_model = None
_scaler_x = None
_scaler_y = None
_feature_names = None
_models_loaded = False


def load_lstm_model():
    """
    Load LSTM model and scalers from disk.
    
    Returns:
        tuple: (model, scaler_X, scaler_y, feature_names) or (None, None, None, None)
    """
    global _lstm_model, _scaler_x, _scaler_y, _feature_names, _models_loaded
    
    if _models_loaded:
        return _lstm_model, _scaler_x, _scaler_y, _feature_names
    
    if not KERAS_AVAILABLE:
        print("❌ Cannot load LSTM: TensorFlow/Keras not available", file=sys.stderr)
        _models_loaded = True
        return None, None, None, None
    
    if not JOBLIB_AVAILABLE:
        print("❌ Cannot load LSTM: joblib not available (needed for scalers)", file=sys.stderr)
        _models_loaded = True
        return None, None, None, None
    
    try:
        # Load LSTM model
        if not validate_model_exists(LSTM_MODEL, "LSTM Model"):
            _models_loaded = True
            return None, None, None, None
        
        print(f"Loading LSTM model from {LSTM_MODEL}...", file=sys.stderr)
        _lstm_model = keras.models.load_model(LSTM_MODEL)
        print("✅ LSTM model loaded", file=sys.stderr)
        
        # Load scalers
        if not validate_model_exists(LSTM_SCALER_X, "LSTM Scaler X"):
            _models_loaded = True
            return None, None, None, None
        
        if not validate_model_exists(LSTM_SCALER_Y, "LSTM Scaler Y"):
            _models_loaded = True
            return None, None, None, None
        
        print("Loading LSTM scalers...", file=sys.stderr)
        _scaler_x = joblib.load(LSTM_SCALER_X)
        _scaler_y = joblib.load(LSTM_SCALER_Y)
        print("✅ LSTM scalers loaded", file=sys.stderr)
        
        # Load feature names (optional)
        if os.path.exists(LSTM_FEATURE_NAMES):
            try:
                _feature_names = joblib.load(LSTM_FEATURE_NAMES)
                print(f"✅ Feature names loaded: {_feature_names}", file=sys.stderr)
            except Exception as e:
                print(f"⚠️  Could not load feature names: {e}", file=sys.stderr)
                _feature_names = None
        
        _models_loaded = True
        return _lstm_model, _scaler_x, _scaler_y, _feature_names
        
    except Exception as e:
        print(f"❌ Failed to load LSTM model: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        _models_loaded = True
        return None, None, None, None


def predict_with_lstm(recent_data, model=None, scaler_x=None, scaler_y=None):
    """
    Use LSTM model to predict future 168 hours (7 days).
    
    Args:
        recent_data: np.array of shape (168, 6) with recent observations
        model: Optional pre-loaded LSTM model
        scaler_x: Optional pre-loaded input scaler
        scaler_y: Optional pre-loaded output scaler
    
    Returns:
        np.array: Predictions of shape (168, 6) or None if failed
    """
    # Load models if not provided
    if model is None or scaler_x is None or scaler_y is None:
        model, scaler_x, scaler_y, _ = load_lstm_model()
    
    if model is None or scaler_x is None or scaler_y is None:
        print("❌ LSTM model or scalers not available", file=sys.stderr)
        return None
    
    try:
        # Ensure exactly 168 timesteps
        if len(recent_data) > 168:
            recent_data = recent_data[-168:]
        elif len(recent_data) < 168:
            # Pad with last value
            padding = np.repeat(recent_data[-1:], 168 - len(recent_data), axis=0)
            recent_data = np.vstack([recent_data, padding])
        
        # Scale input
        X_scaled = scaler_x.transform(recent_data)
        X_input = X_scaled.reshape(1, 168, 6)
        
        # Predict (168 hours, 6 features)
        print("  Running LSTM prediction...", file=sys.stderr)
        y_pred_scaled = model.predict(X_input, verbose=0)
        
        # Inverse transform to get real values
        y_pred_flat = y_pred_scaled.reshape(-1, 6)
        y_pred = scaler_y.inverse_transform(y_pred_flat).reshape(168, 6)
        
        print("✅ LSTM prediction complete", file=sys.stderr)
        return y_pred
        
    except Exception as e:
        print(f"❌ LSTM prediction failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None


def get_model_info():
    """Get information about loaded LSTM model"""
    model, scaler_x, scaler_y, feature_names = load_lstm_model()
    
    if model is None:
        return {'loaded': False, 'error': 'Model not available'}
    
    try:
        info = {
            'loaded': True,
            'type': 'LSTM',
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'total_params': model.count_params(),
            'scaler_x_loaded': scaler_x is not None,
            'scaler_y_loaded': scaler_y is not None,
            'feature_names': feature_names if feature_names else 'Not loaded'
        }
        return info
    except Exception as e:
        return {'loaded': True, 'error': str(e)}
