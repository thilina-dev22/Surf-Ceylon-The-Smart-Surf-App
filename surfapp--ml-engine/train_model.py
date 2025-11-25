import pandas as pd
import joblib
import os
import requests
import sys
import arrow
import json
import numpy as np
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# --- Configuration ---
load_dotenv()
STORMGLASS_API_KEY = os.getenv("STORMGLASS_API_KEY")
MODEL_FILENAME = 'surf_forecast_model.joblib' # New model name for the multi-output model
MODEL_PATH = os.path.join(os.path.dirname(__file__), MODEL_FILENAME)

# --- Features & Targets Definition ---
# These are the inputs the model will learn from.
FEATURE_NAMES = [
    'swellHeight', 'swellPeriod', 'swellDirection', 'windSpeed',
    'windDirection', 'seaLevel', 'gust', 'secondarySwellHeight',
    'secondarySwellPeriod', 'secondarySwellDirection'
]
# These are the multiple outputs the model will predict.
TARGET_NAMES = ['waveHeight', 'wavePeriod', 'windSpeed', 'windDirection']

# Engineered features will be added during preprocessing
ENGINEERED_FEATURES = []

# A single spot is used for this focused training example.
SURF_SPOT = {'id': '2', 'name': 'Weligama', 'lat': 5.972, 'lng': 80.426}
MAX_DAYS_PER_REQUEST = 10 # Stormglass historical data limit

def _get_average_from_sources(source_dict):
    """
    Averages the values from different weather sources (e.g., sg, noaa, meteo).
    This creates a more robust single value for each parameter.
    """
    if not source_dict: return None
    valid_values = [v for v in source_dict.values() if isinstance(v, (int, float))]
    return sum(valid_values) / len(valid_values) if valid_values else None

def fetch_historical_data_for_training():
    """Fetches and processes historical data for both features and targets."""
    if not STORMGLASS_API_KEY or STORMGLASS_API_KEY == 'your_api_key_here':
        print("Error: STORMGLASS_API_KEY environment variable is not set or invalid.", file=sys.stderr)
        return None

    # Fetch the last 10 days of data for training.
    start_date = arrow.utcnow().shift(days=-MAX_DAYS_PER_REQUEST)
    end_date = arrow.utcnow()
    
    # Request all parameters needed for both the features and the targets.
    all_params = ','.join(list(set(FEATURE_NAMES + TARGET_NAMES)))
    
    try:
        response = requests.get(
            'https://api.stormglass.io/v2/weather/point',
            params={
                'lat': SURF_SPOT['lat'], 
                'lng': SURF_SPOT['lng'],
                'params': all_params,
                'start': start_date.timestamp(), 
                'end': end_date.timestamp(),
            },
            headers={'Authorization': STORMGLASS_API_KEY}
        )
        response.raise_for_status()
        data = response.json()
        
        if 'hours' not in data or not data['hours']:
            print("Warning: Stormglass API returned no historical data.", file=sys.stderr)
            return None

        print(f"Successfully fetched {len(data['hours'])} hourly records for training.", file=sys.stderr)
        
        # Process the raw hourly data into a clean list of records
        processed_data = []
        for hour in data['hours']:
            record = {}
            is_valid_record = True
            for param in all_params.split(','):
                value = _get_average_from_sources(hour.get(param, {}))
                if value is None:
                    is_valid_record = False
                    break
                record[param] = value
            if is_valid_record:
                processed_data.append(record)

        return pd.DataFrame(processed_data)

    except requests.exceptions.RequestException as e:
        print(f"CRITICAL API ERROR: Could not fetch training data from Stormglass. {e}", file=sys.stderr)
        return None

def load_historical_data_from_files():
    """Load training data from collected JSON files instead of API."""
    print("Loading historical data from local JSON files...", file=sys.stderr)
    
    all_records = []
    files = [
        'weligama_historical_data_fixed.json',
        'arugam_bay_historical_data_fixed.json'
    ]
    
    for filepath in files:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            if 'hours' not in data or not data['hours']:
                print(f"Warning: No 'hours' data in {filepath}", file=sys.stderr)
                continue
            
            all_params = ','.join(list(set(FEATURE_NAMES + TARGET_NAMES)))
            
            for hour in data.get('hours', []):
                record = {}
                is_valid = True
                
                for param in all_params.split(','):
                    value = _get_average_from_sources(hour.get(param, {}))
                    if value is None:
                        is_valid = False
                        break
                    record[param] = value
                
                if is_valid:
                    all_records.append(record)
            
            print(f"  Loaded {len([r for r in all_records])} records from {filepath}", file=sys.stderr)
        
        except FileNotFoundError:
            print(f"Warning: {filepath} not found, skipping...", file=sys.stderr)
            continue
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in {filepath}", file=sys.stderr)
            continue
    
    if not all_records:
        print("Error: No valid training data found in local files", file=sys.stderr)
        return None
    
    print(f"Total records loaded: {len(all_records)}", file=sys.stderr)
    return pd.DataFrame(all_records)

def preprocess_data(df):
    """Enhanced preprocessing with feature engineering."""
    print("\n" + "="*70, file=sys.stderr)
    print("DATA PREPROCESSING", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    # 1. Remove duplicates
    original_len = len(df)
    df = df.drop_duplicates()
    removed = original_len - len(df)
    if removed > 0:
        print(f"✓ Removed {removed} duplicate records", file=sys.stderr)
    
    # 2. Handle missing values
    all_columns = FEATURE_NAMES + TARGET_NAMES
    print("\nMissing value analysis:", file=sys.stderr)
    for col in all_columns:
        if col in df.columns:
            missing_pct = (df[col].isna().sum() / len(df)) * 100
            if missing_pct > 0:
                print(f"  {col}: {missing_pct:.2f}% missing - filling with median", file=sys.stderr)
                df[col].fillna(df[col].median(), inplace=True)
    
    # 3. Remove outliers using IQR method
    print("\nOutlier removal:", file=sys.stderr)
    for col in all_columns:
        if col in df.columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            outliers = outliers_mask.sum()
            if outliers > 0:
                print(f"  {col}: Removing {outliers} outliers", file=sys.stderr)
                df = df[~outliers_mask]
    
    # 4. Feature Engineering
    print("\n" + "="*70, file=sys.stderr)
    print("FEATURE ENGINEERING", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    global ENGINEERED_FEATURES
    ENGINEERED_FEATURES = []
    
    # Swell energy (height² × period) - Primary wave power indicator
    if 'swellHeight' in df.columns and 'swellPeriod' in df.columns:
        df['swellEnergy'] = df['swellHeight']**2 * df['swellPeriod']
        ENGINEERED_FEATURES.append('swellEnergy')
        print("✓ Created swellEnergy (height² × period)", file=sys.stderr)
    
    # Offshore wind factor - Wind favorable for surfing
    if 'windSpeed' in df.columns and 'windDirection' in df.columns:
        # For south coast Sri Lanka, offshore is roughly 270-360 degrees
        df['offshoreWind'] = df['windSpeed'] * np.cos(np.radians(df['windDirection'] - 270))
        ENGINEERED_FEATURES.append('offshoreWind')
        print("✓ Created offshoreWind (speed × direction alignment)", file=sys.stderr)
    
    # Combined swell height (primary + secondary)
    if 'swellHeight' in df.columns and 'secondarySwellHeight' in df.columns:
        df['totalSwellHeight'] = df['swellHeight'] + df['secondarySwellHeight']
        ENGINEERED_FEATURES.append('totalSwellHeight')
        print("✓ Created totalSwellHeight (primary + secondary)", file=sys.stderr)
    
    # Wind-swell interaction
    if 'windSpeed' in df.columns and 'swellHeight' in df.columns:
        df['windSwellInteraction'] = df['windSpeed'] * df['swellHeight']
        ENGINEERED_FEATURES.append('windSwellInteraction')
        print("✓ Created windSwellInteraction (wind × swell)", file=sys.stderr)
    
    # Period ratio (indicates wave quality)
    if 'swellPeriod' in df.columns and 'secondarySwellPeriod' in df.columns:
        df['periodRatio'] = df['swellPeriod'] / (df['secondarySwellPeriod'] + 1)  # +1 to avoid division by zero
        ENGINEERED_FEATURES.append('periodRatio')
        print("✓ Created periodRatio (primary/secondary period)", file=sys.stderr)
    
    print(f"\n✅ Final dataset: {len(df)} records with {len(FEATURE_NAMES) + len(ENGINEERED_FEATURES)} features", file=sys.stderr)
    return df

def train_model(df):
    """Trains a multi-output Random Forest Regressor and saves it to a file."""
    if df is None or df.empty:
        print("Training cannot proceed with an empty DataFrame.", file=sys.stderr)
        return

    # Apply preprocessing and feature engineering
    df = preprocess_data(df)
    
    # Validate that all required columns are present
    missing_features = set(FEATURE_NAMES) - set(df.columns)
    missing_targets = set(TARGET_NAMES) - set(df.columns)
    
    if missing_features or missing_targets:
        print(f"Error: Missing columns. Features: {missing_features}, Targets: {missing_targets}", file=sys.stderr)
        return

    print("\n" + "="*70, file=sys.stderr)
    print("MODEL TRAINING", file=sys.stderr)
    print("="*70, file=sys.stderr)
    print(f"Training samples: {len(df)}", file=sys.stderr)
    
    # Define the features (X) and the multiple targets (y)
    # Include both original and engineered features
    all_features = FEATURE_NAMES + ENGINEERED_FEATURES
    X = df[all_features]
    y = df[TARGET_NAMES]
    
    print(f"Features: {len(all_features)} ({len(FEATURE_NAMES)} original + {len(ENGINEERED_FEATURES)} engineered)", file=sys.stderr)
    print(f"Targets: {len(TARGET_NAMES)}", file=sys.stderr)
    
    # Split data for training and testing
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"\nTrain set: {len(X_train)} samples", file=sys.stderr)
    print(f"Test set: {len(X_test)} samples", file=sys.stderr)
    
    # Initialize and train the model with optimized hyperparameters
    model = RandomForestRegressor(
        n_estimators=200,        # Increased trees for better performance
        max_depth=15,            # Prevent overfitting
        min_samples_split=5,     # Minimum samples to split
        min_samples_leaf=2,      # Minimum samples per leaf
        max_features='sqrt',     # Use sqrt of features per tree
        random_state=42,
        n_jobs=-1,              # Use all CPU cores
        verbose=0
    )
    
    print("\nTraining Random Forest model...", file=sys.stderr)
    model.fit(X_train, y_train)
    
    # Calculate predictions
    y_pred = model.predict(X_test)
    
    # Evaluate each target separately
    print("\n" + "="*70, file=sys.stderr)
    print("MODEL PERFORMANCE", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    for i, target in enumerate(TARGET_NAMES):
        r2 = r2_score(y_test.iloc[:, i], y_pred[:, i])
        mae = mean_absolute_error(y_test.iloc[:, i], y_pred[:, i])
        rmse = np.sqrt(mean_squared_error(y_test.iloc[:, i], y_pred[:, i]))
        print(f"\n{target}:")
        print(f"  R² Score:  {r2:.4f}")
        print(f"  MAE:       {mae:.4f}")
        print(f"  RMSE:      {rmse:.4f}")
    
    # Overall model score
    overall_score = model.score(X_test, y_test)
    print(f"\nOverall R² Score: {overall_score:.4f}", file=sys.stderr)
    
    # Feature importance analysis
    print("\n" + "="*70, file=sys.stderr)
    print("FEATURE IMPORTANCE (Top 10)", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    feature_importance = pd.DataFrame({
        'feature': all_features,
        'importance': model.estimators_[0].feature_importances_
    }).sort_values('importance', ascending=False)
    
    for idx, row in feature_importance.head(10).iterrows():
        bar = '█' * int(row['importance'] * 100)
        print(f"  {row['feature']:30} | {row['importance']:.4f} {bar}", file=sys.stderr)
    
    # Save the trained model to disk
    model_data = {
        'model': model,
        'feature_names': all_features,
        'target_names': TARGET_NAMES,
        'engineered_features': ENGINEERED_FEATURES
    }
    joblib.dump(model_data, MODEL_PATH)
    print(f"\n✅ Model saved successfully to '{MODEL_PATH}'", file=sys.stderr)
    
    # Save feature list for reference
    with open('model_features.txt', 'w') as f:
        f.write("ORIGINAL FEATURES:\n")
        for feat in FEATURE_NAMES:
            f.write(f"  - {feat}\n")
        f.write("\nENGINEERED FEATURES:\n")
        for feat in ENGINEERED_FEATURES:
            f.write(f"  - {feat}\n")
        f.write("\nTARGETS:\n")
        for targ in TARGET_NAMES:
            f.write(f"  - {targ}\n")
    print("✅ Feature list saved to 'model_features.txt'", file=sys.stderr)

if __name__ == '__main__':
    print("\n" + "="*70)
    print("SURF FORECAST MODEL TRAINING")
    print("="*70 + "\n")
    
    # Try to load from local files first, fall back to API if needed
    training_df = load_historical_data_from_files()
    
    if training_df is None or training_df.empty:
        print("\nLocal files not found. Attempting to fetch from API...", file=sys.stderr)
        training_df = fetch_historical_data_for_training()
    
    # Train model if data is valid
    if training_df is not None and not training_df.empty:
        train_model(training_df)
        print("\n" + "="*70)
        print("✅ TRAINING COMPLETE")
        print("="*70 + "\n")
    else:
        print("\n❌ Training aborted due to lack of valid historical data.", file=sys.stderr)