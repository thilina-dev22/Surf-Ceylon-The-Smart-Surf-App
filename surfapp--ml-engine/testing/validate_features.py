import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
from scipy.stats import pearsonr
import sys

# Feature names (must match train_model.py)
FEATURE_NAMES = [
    'swellHeight', 'swellPeriod', 'swellDirection', 'windSpeed',
    'windDirection', 'seaLevel', 'gust', 'secondarySwellHeight',
    'secondarySwellPeriod', 'secondarySwellDirection'
]
TARGET_NAMES = ['waveHeight', 'wavePeriod', 'windSpeed', 'windDirection']

def get_average_from_sources(source_dict):
    """Calculate average from multiple weather data sources."""
    if not source_dict or not isinstance(source_dict, dict):
        return None
    values = [v for v in source_dict.values() if v is not None and isinstance(v, (int, float))]
    return sum(values) / len(values) if values else None

def load_historical_data(file_path, sample_size=5000):
    """Load and flatten historical JSON data with sampling for large files."""
    print(f"Loading {file_path}...", file=sys.stderr)
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        if 'hours' not in data or not data['hours']:
            print(f"  Error: No 'hours' data found in {file_path}", file=sys.stderr)
            return None
        
        print(f"  Total records in file: {len(data['hours'])}", file=sys.stderr)
        
        # Sample data if too large
        hours_data = data['hours']
        if len(hours_data) > sample_size:
            print(f"  Sampling {sample_size} records from {len(hours_data)} total...", file=sys.stderr)
            import random
            hours_data = random.sample(hours_data, sample_size)
        
        records = []
        for entry in hours_data:
            record = {}
            for key, value in entry.items():
                if isinstance(value, dict):
                    # Average multi-source values (noaa, sg, etc.)
                    avg_val = get_average_from_sources(value)
                    if avg_val is not None:
                        record[key] = avg_val
                elif isinstance(value, (int, float)):
                    record[key] = value
                elif key == 'time':
                    record[key] = value
            
            if record:
                records.append(record)
        
        print(f"  ✓ Loaded {len(records)} records", file=sys.stderr)
        return pd.DataFrame(records)
    
    except FileNotFoundError:
        print(f"  Error: File not found - {file_path}", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print(f"  Error: Invalid JSON in {file_path}", file=sys.stderr)
        return None

def analyze_correlations(df):
    """Analyze correlation between features and targets."""
    print("\n" + "="*70)
    print("CORRELATION ANALYSIS")
    print("="*70)
    
    for target in TARGET_NAMES:
        print(f"\n--- {target.upper()} Correlations ---")
        correlations = {}
        
        for feature in FEATURE_NAMES:
            # Skip if feature and target are the same variable
            if feature == target:
                continue
                
            if feature in df.columns and target in df.columns:
                # Remove NaN values
                valid_data = df[[feature, target]].dropna()
                if len(valid_data) > 10:  # Need minimum data points
                    corr, p_value = pearsonr(valid_data[feature], valid_data[target])
                    correlations[feature] = {
                        'correlation': corr,
                        'p_value': p_value,
                        'significant': p_value < 0.05
                    }
                    
                    significance = '✓ Significant' if p_value < 0.05 else '✗ Not significant'
                    print(f"  {feature:30} | r={corr:+.3f} | p={p_value:.4f} | {significance}")
        
        # Identify strongest predictors
        strong_predictors = {k: v for k, v in correlations.items() 
                           if abs(v['correlation']) > 0.5 and v['significant']}
        
        if strong_predictors:
            print(f"\n  🎯 Strong predictors for {target}:")
            for feat, stats in sorted(strong_predictors.items(), 
                                     key=lambda x: abs(x[1]['correlation']), 
                                     reverse=True):
                print(f"     - {feat}: r={stats['correlation']:+.3f}")
        else:
            print(f"\n  ⚠️  No strong predictors found for {target}")

def create_correlation_heatmap(df):
    """Create correlation heatmap."""
    all_vars = FEATURE_NAMES + TARGET_NAMES
    available_vars = [v for v in all_vars if v in df.columns]
    
    if len(available_vars) < 2:
        print("\n⚠️  Not enough variables for correlation heatmap", file=sys.stderr)
        return
    
    correlation_matrix = df[available_vars].corr()
    
    plt.figure(figsize=(16, 12))
    sns.heatmap(correlation_matrix, annot=True, fmt='.2f', 
                cmap='coolwarm', center=0, vmin=-1, vmax=1,
                square=True, linewidths=0.5)
    plt.title('Feature-Target Correlation Matrix', fontsize=18, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig('correlation_heatmap.png', dpi=300, bbox_inches='tight')
    print("\n✅ Correlation heatmap saved as 'correlation_heatmap.png'")

def analyze_missing_data(df):
    """Analyze missing data patterns."""
    print("\n" + "="*70)
    print("MISSING DATA ANALYSIS")
    print("="*70 + "\n")
    
    all_vars = FEATURE_NAMES + TARGET_NAMES
    missing_stats = {}
    
    for var in all_vars:
        if var in df.columns:
            total = len(df)
            missing = df[var].isna().sum()
            pct = (missing / total) * 100
            missing_stats[var] = {'count': missing, 'percentage': pct}
            
            if pct > 0:
                print(f"  {var:30} | Missing: {missing:6d} ({pct:5.2f}%)")
    
    # Identify problematic features
    problematic = {k: v for k, v in missing_stats.items() if v['percentage'] > 10}
    if problematic:
        print(f"\n  ⚠️  Features with >10% missing data:")
        for feat, stats in problematic.items():
            print(f"     - {feat}: {stats['percentage']:.2f}%")
    else:
        print("\n  ✅ No features with excessive missing data")

def analyze_data_distribution(df):
    """Analyze data distribution and outliers."""
    print("\n" + "="*70)
    print("DATA DISTRIBUTION ANALYSIS")
    print("="*70 + "\n")
    
    all_vars = FEATURE_NAMES + TARGET_NAMES
    
    for var in all_vars:
        if var in df.columns:
            data = df[var].dropna()
            if len(data) > 0:
                Q1 = data.quantile(0.25)
                Q3 = data.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outliers = ((data < lower_bound) | (data > upper_bound)).sum()
                outlier_pct = (outliers / len(data)) * 100
                
                print(f"  {var:30} | Mean: {data.mean():8.2f} | Std: {data.std():8.2f} | Outliers: {outliers:4d} ({outlier_pct:5.2f}%)")

if __name__ == '__main__':
    print("\n" + "="*70)
    print("SURF FORECAST MODEL - FEATURE VALIDATION")
    print("="*70 + "\n")
    
    # Load both datasets
    dfs = []
    for file_name in ['weligama_historical_data_fixed.json', 'arugam_bay_historical_data_fixed.json']:
        df = load_historical_data(file_name)
        if df is not None:
            dfs.append(df)
    
    if not dfs:
        print("\n❌ Error: No valid data files found", file=sys.stderr)
        sys.exit(1)
    
    # Combine datasets
    combined_df = pd.concat(dfs, ignore_index=True)
    
    print(f"\n📊 Combined dataset: {len(combined_df)} total records")
    if 'time' in combined_df.columns:
        print(f"📅 Date range: {combined_df['time'].min()} to {combined_df['time'].max()}")
    
    # Run analyses
    analyze_missing_data(combined_df)
    analyze_data_distribution(combined_df)
    analyze_correlations(combined_df)
    create_correlation_heatmap(combined_df)
    
    print("\n" + "="*70)
    print("✅ VALIDATION COMPLETE")
    print("="*70 + "\n")
