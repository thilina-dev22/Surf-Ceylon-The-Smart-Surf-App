#!/usr/bin/env python3
"""
Spot Recommender Service (Refactored)
Uses modular architecture with clean separation of concerns.

This file maintains backward compatibility with Node.js backend.
All business logic has been extracted to organized modules:
- config/ - API keys, model paths, features, settings
- models/ - Random Forest model wrapper
- utils/ - API client, feature engineering, mock data
- services/ - Main prediction logic

Usage:
    python spot_recommender_service.py
    
Output:
    JSON array of surf spots with forecast predictions
"""

# Import from services layer (which uses all other modules)
from services.spot_predictor import main

if __name__ == '__main__':
    main()
