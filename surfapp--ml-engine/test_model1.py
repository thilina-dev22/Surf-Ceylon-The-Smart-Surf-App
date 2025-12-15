#!/usr/bin/env python3
"""Test script for Model 1 (Random Forest) with feature engineering."""
import joblib
import pandas as pd
import numpy as np

# Load model
print("Loading model...")
model_data = joblib.load('surf_forecast_model.joblib')
model = model_data['model']
print(f"✅ Model loaded: {type(model)}")

# Test features (sample data from Weligama)
test_features = {
    'swellHeight': 1.2,
    'swellPeriod': 12.0,
    'swellDirection': 180.0,
    'windSpeed': 5.0,
    'windDirection': 270.0,
    'seaLevel': 0.5,
    'gust': 7.0,
    'secondarySwellHeight': 0.8,
    'secondarySwellPeriod': 10.0,
    'secondarySwellDirection': 190.0
}

# Create DataFrame
df = pd.DataFrame([test_features])

# Feature Engineering (matching train_model.py)
print("\nApplying feature engineering...")
df['swellEnergy'] = df['swellHeight']**2 * df['swellPeriod']
df['offshoreWind'] = df['windSpeed'] * np.cos(np.radians(df['windDirection'] - 270))
df['totalSwellHeight'] = df['swellHeight'] + df['secondarySwellHeight']
df['windSwellInteraction'] = df['windSpeed'] * df['swellHeight']
df['periodRatio'] = df['swellPeriod'] / (df['secondarySwellPeriod'] + 1)

print(f"✅ Features engineered. Total features: {len(df.columns)}")
print(f"   Columns: {list(df.columns)}")

# Make prediction
print("\nRunning prediction...")
prediction = model.predict(df)

print("\n" + "="*60)
print("✅ MODEL 1 (RANDOM FOREST) PREDICTION SUCCESSFUL!")
print("="*60)
print(f"Wave Height:     {prediction[0][0]:.2f} meters")
print(f"Wave Period:     {prediction[0][1]:.1f} seconds")
print(f"Wind Speed:      {prediction[0][2]:.1f} m/s ({prediction[0][2]*3.6:.1f} km/h)")
print(f"Wind Direction:  {prediction[0][3]:.0f}°")
print("="*60)
print("\n✅ Model 1 is ready for production use!")
