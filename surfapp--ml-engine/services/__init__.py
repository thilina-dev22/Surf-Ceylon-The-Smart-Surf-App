"""Python package initialization for services module"""
from .spot_predictor import get_spots_with_predictions, run_ml_prediction
from .forecast_predictor import predict_7day_forecast

__all__ = [
    'get_spots_with_predictions',
    'run_ml_prediction',
    'predict_7day_forecast'
]
