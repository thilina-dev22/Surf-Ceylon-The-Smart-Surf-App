#!/usr/bin/env python3
"""
7-Day Forecast Service (Refactored)
Uses modular architecture with clean separation of concerns.

This file maintains backward compatibility with Node.js backend.
All business logic has been extracted to organized modules:
- config/ - API keys, model paths, features, settings
- models/ - LSTM model wrapper with scalers
- utils/ - API client (19-key rotation), mock data, date utilities
- services/ - Main forecast logic

Usage:
    python forecast_7day_service.py <lat> <lng>
    
Example:
    python forecast_7day_service.py 5.9721 80.4264
    
Output:
    JSON with 7-day forecast (daily + hourly data)
"""

# Import from services layer (which uses all other modules)
from services.forecast_predictor import main

if __name__ == '__main__':
    main()
