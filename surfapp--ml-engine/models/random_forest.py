"""Random Forest Model Wrapper"""
import sys
import os
from config import RANDOM_FOREST_MODEL, validate_model_exists

# Try to import joblib
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False
    print("Warning: joblib not available. Random Forest model cannot be loaded.", file=sys.stderr)

# Global model instance
_model_instance = None
_model_loaded = False


def load_random_forest_model():
    """
    Load Random Forest model from disk.
    Model is a dictionary containing the trained scikit-learn RandomForestRegressor.
    
    Returns:
        model or None: Loaded model if successful, None otherwise
    """
    global _model_instance, _model_loaded
    
    if _model_loaded:
        return _model_instance
    
    if not JOBLIB_AVAILABLE:
        print("❌ Cannot load Random Forest: joblib not available", file=sys.stderr)
        _model_loaded = True
        return None
    
    if not validate_model_exists(RANDOM_FOREST_MODEL, "Random Forest Model"):
        _model_loaded = True
        return None
    
    try:
        print(f"Loading Random Forest model from {RANDOM_FOREST_MODEL}...", file=sys.stderr)
        model_data = joblib.load(RANDOM_FOREST_MODEL)
        
        # Extract model from dictionary structure
        if isinstance(model_data, dict):
            _model_instance = model_data.get('model')
            if not _model_instance:
                print("❌ Model dictionary missing 'model' key", file=sys.stderr)
                _model_loaded = True
                return None
        else:
            _model_instance = model_data
        
        print("✅ Random Forest model loaded successfully", file=sys.stderr)
        _model_loaded = True
        return _model_instance
        
    except Exception as e:
        print(f"❌ Failed to load Random Forest model: {e}", file=sys.stderr)
        _model_loaded = True
        return None


def predict_with_random_forest(input_features, model=None):
    """
    Make prediction using Random Forest model.
    
    Args:
        input_features: DataFrame with 15 features (10 base + 5 engineered)
        model: Optional pre-loaded model (will load if None)
    
    Returns:
        np.array: Predictions [waveHeight, wavePeriod, windSpeed, windDirection]
    """
    if model is None:
        model = load_random_forest_model()
    
    if model is None:
        raise ValueError("Random Forest model not available")
    
    try:
        predictions = model.predict(input_features)
        return predictions
        
    except Exception as e:
        print(f"❌ Random Forest prediction failed: {e}", file=sys.stderr)
        raise


def get_model_info():
    """Get information about loaded Random Forest model"""
    model = load_random_forest_model()
    
    if model is None:
        return {'loaded': False, 'error': 'Model not available'}
    
    try:
        info = {
            'loaded': True,
            'type': type(model).__name__,
            'n_estimators': getattr(model, 'n_estimators', 'unknown'),
            'n_features': getattr(model, 'n_features_in_', 'unknown'),
            'n_outputs': getattr(model, 'n_outputs_', 'unknown')
        }
        return info
    except Exception as e:
        return {'loaded': True, 'error': str(e)}
