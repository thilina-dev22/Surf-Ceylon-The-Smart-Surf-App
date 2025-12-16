# ML Engine File Organization

## Current Issue
All development, training, and production files are mixed in the root directory, making it unclear which files are needed for production vs development.

## Production Files (MUST Stay in Root)

### Entry Points
- `spot_recommender_service.py` - Main service for spot recommendations
- `forecast_7day_service.py` - Main service for 7-day forecasts

### Model Files (127+ MB total)
- `surf_forecast_model.joblib` - Random Forest model (127MB)
- `wave_forecast_multioutput_lstm.keras` - LSTM model (~164KB)
- `wave_forecast_scaler_X_multioutput.joblib` - LSTM input scaler
- `wave_forecast_scaler_y_multioutput.joblib` - LSTM output scaler
- `wave_forecast_feature_names.joblib` - Feature names for LSTM

### Configuration
- `requirements.txt` - Python dependencies
- `.env` - API keys (if exists)
- `.env.example` - Template for environment variables
- `.gitignore` - Git ignore rules

## Development Files (Should Be Organized)

### Training Scripts → `training/`
- `train_model.py` - Random Forest training
- `train_wave_forecast_lstm.py` - LSTM training
- `train_with_local_data.py` - Local training variant
- `prepare_timeseries_data.py` - Data preprocessing
- `collect_historical_data.py` - API data collection

### Testing Scripts → `testing/`
- `test_model1.py` - Model tests
- `test_wave_forecast.py` - Forecast tests
- `validate_features.py` - Feature validation
- `run_analysis.py` - Analysis script
- `test_results.json` - Test output

### Data Files → `data/`
- `weligama_historical_data_fixed.json` - Historical data (~50 spots)
- `arugam_bay_historical_data_fixed.json` - Historical data
- `model_features.txt` - Feature documentation

### Training Artifacts → `artifacts/`
- `timeseries_X_multioutput.npy` - Training data (could be large)
- `timeseries_y_multioutput.npy` - Training labels
- `training_history_multioutput.png` - Training visualization
- `correlation_heatmap.png` - Analysis visualization
- `sample_predictions.png` - Results visualization

## Recommended Actions

### Option 1: Organize with Script
```bash
cd surfapp--ml-engine
python organize_files.py
```

This will:
1. Move training files to `training/`
2. Move testing files to `testing/`
3. Move data files to `data/`
4. Move artifacts to `artifacts/`
5. Keep all production files in root

### Option 2: Manual Cleanup
You can manually move files or delete them if not needed:
- Training scripts: Only needed if you want to retrain models
- Testing scripts: Only needed for development/validation
- Artifacts: Only needed to review training history
- Historical data: Only needed for retraining

### Option 3: Delete Development Files
If you don't plan to retrain models, you can delete all development files and keep only:
- The 2 main service files
- The 5 model/scaler files
- requirements.txt

## No Duplicates Found
After reviewing, there are **no duplicate files**. However, you have:
- Old backup files were already deleted (server_old.js, *_old.py)
- Current files are all unique and serve different purposes

## After Organization

```
surfapp--ml-engine/
├── spot_recommender_service.py         ← Production
├── forecast_7day_service.py            ← Production
├── surf_forecast_model.joblib          ← Production (127MB)
├── wave_forecast_*.joblib/.keras       ← Production (5 files)
├── requirements.txt                     ← Production
├── config/                              ← Production
├── models/                              ← Production
├── services/                            ← Production
├── utils/                               ← Production
├── training/                            ← Development only
│   ├── train_model.py
│   ├── train_wave_forecast_lstm.py
│   ├── collect_historical_data.py
│   └── ...
├── testing/                             ← Development only
│   ├── test_model1.py
│   ├── test_wave_forecast.py
│   └── ...
├── data/                                ← Development only
│   ├── weligama_historical_data_fixed.json
│   └── arugam_bay_historical_data_fixed.json
└── artifacts/                           ← Development only
    ├── timeseries_X_multioutput.npy
    ├── training_history_multioutput.png
    └── ...
```

## What to Keep for Production Deployment

If deploying to production server:
- ✅ Keep: 2 service files, 5 model files, requirements.txt, config/, models/, services/, utils/
- ❌ Remove: training/, testing/, data/, artifacts/, venv/ (recreate on server)

Total production size: ~127MB (mostly the Random Forest model)
