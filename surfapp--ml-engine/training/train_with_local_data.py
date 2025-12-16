"""
Train surf forecast model using local historical data files.
This script loads the collected historical data and trains the ML model.
"""

import pandas as pd
import json
import sys
import random
from train_model import (
    train_model, 
    FEATURE_NAMES, 
    TARGET_NAMES,
    _get_average_from_sources
)

def load_historical_data_from_json(file_path, sample_size=None):
    """Load training data from collected JSON files."""
    print(f"\nLoading {file_path}...", file=sys.stderr)
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if 'hours' not in data or not data['hours']:
            print(f"  Error: No 'hours' data found in {file_path}", file=sys.stderr)
            return None
        
        hours_data = data['hours']
        total_records = len(hours_data)
        print(f"  Total records in file: {total_records}", file=sys.stderr)
        
        # Sample if needed
        if sample_size and total_records > sample_size:
            print(f"  Sampling {sample_size} records...", file=sys.stderr)
            hours_data = random.sample(hours_data, sample_size)
        
        # Extract required parameters
        all_params = set(FEATURE_NAMES + TARGET_NAMES)
        records = []
        
        for hour in hours_data:
            record = {}
            is_valid = True
            
            for param in all_params:
                value = _get_average_from_sources(hour.get(param, {}))
                if value is None:
                    is_valid = False
                    break
                record[param] = value
            
            if is_valid:
                records.append(record)
        
        valid_pct = (len(records) / len(hours_data)) * 100
        print(f"  ✓ Loaded {len(records)} valid records ({valid_pct:.1f}%)", file=sys.stderr)
        
        return pd.DataFrame(records)
    
    except FileNotFoundError:
        print(f"  ❌ File not found: {file_path}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"  ❌ Invalid JSON in {file_path}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  ❌ Error loading {file_path}: {e}", file=sys.stderr)
        return None

def main():
    """Main training pipeline."""
    print("\n" + "="*70)
    print("SURF FORECAST MODEL - LOCAL DATA TRAINING")
    print("="*70)
    
    # Load data from both surf spots
    files = [
        '../data/weligama_historical_data_fixed.json',
        '../data/arugam_bay_historical_data_fixed.json'
    ]
    
    dataframes = []
    for file_path in files:
        df = load_historical_data_from_json(file_path, sample_size=10000)
        if df is not None and not df.empty:
            dataframes.append(df)
    
    if not dataframes:
        print("\n❌ No valid training data found. Exiting.", file=sys.stderr)
        sys.exit(1)
    
    # Combine all data
    combined_df = pd.concat(dataframes, ignore_index=True)
    
    print(f"\n📊 Combined Training Dataset", file=sys.stderr)
    print(f"   Total records: {len(combined_df)}", file=sys.stderr)
    print(f"   Features: {len(FEATURE_NAMES)}", file=sys.stderr)
    print(f"   Targets: {len(TARGET_NAMES)}", file=sys.stderr)
    
    # Train the model
    train_model(combined_df)
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()
