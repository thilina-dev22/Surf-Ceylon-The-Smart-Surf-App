"""Python package initialization for utils module"""
from .api_client import (
    fetch_weather_data_with_rotation,
    fetch_historical_data_with_rotation
)
from .data_processor import (
    get_average_from_sources,
    process_stormglass_api_response,
    sanitize_prediction
)
from .feature_engineering import (
    calculate_engineered_features,
    validate_features
)
from .mock_data import (
    generate_mock_spot_forecast,
    generate_mock_timeseries_data,
    generate_forecast_from_trend_extrapolation
)
from .date_utils import (
    generate_date_labels,
    aggregate_hourly_to_daily,
    get_current_timestamp_iso
)

__all__ = [
    # API Client
    'fetch_weather_data_with_rotation',
    'fetch_historical_data_with_rotation',
    
    # Data Processor
    'get_average_from_sources',
    'process_stormglass_api_response',
    'sanitize_prediction',
    
    # Feature Engineering
    'calculate_engineered_features',
    'validate_features',
    
    # Mock Data
    'generate_mock_spot_forecast',
    'generate_mock_timeseries_data',
    'generate_forecast_from_trend_extrapolation',
    
    # Date Utils
    'generate_date_labels',
    'aggregate_hourly_to_daily',
    'get_current_timestamp_iso'
]
