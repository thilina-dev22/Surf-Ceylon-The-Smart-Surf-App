import subprocess
import sys
import os

print("=" * 70)
print("SURF FORECAST MODEL - COMPLETE ANALYSIS PIPELINE")
print("=" * 70)

# Change to the correct directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Step 1: Validate features and correlations
print("\n[1/2] Running feature validation and correlation analysis...")
print("-" * 70)
result = subprocess.run([sys.executable, 'validate_features.py'], 
                       capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(result.stderr)

if result.returncode != 0:
    print("\n⚠️  Warning: Feature validation encountered issues")
else:
    print("\n✅ Feature validation complete")

# Step 2: Train model with local data
print("\n[2/2] Training model with local historical data...")
print("-" * 70)
result = subprocess.run([sys.executable, 'train_with_local_data.py'], 
                       capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(result.stderr)

if result.returncode != 0:
    print("\n❌ Error: Model training failed")
    sys.exit(1)
else:
    print("\n✅ Model training complete")

print("\n" + "=" * 70)
print("✅ COMPLETE ANALYSIS FINISHED")
print("=" * 70)
print("\nGenerated files:")
print("  - correlation_heatmap.png    (Feature correlation visualization)")
print("  - surf_forecast_model.joblib (Trained ML model)")
print("  - model_features.txt         (Feature documentation)")
print("\n" + "=" * 70)
