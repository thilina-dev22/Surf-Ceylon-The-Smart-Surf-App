"""
Train Multi-Output LSTM model for 7-day surf forecasting
Predicts: Wave Height, Wave Period, Swell Height, Swell Period, Wind Speed, Wind Direction

FIXED VERSION - Handles NaN values, gradient clipping, and proper scaling
"""
import numpy as np
import os
import sys

# Check TensorFlow availability
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, RepeatVector, TimeDistributed
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TerminateOnNaN
    TF_AVAILABLE = True
except ImportError:
    print("❌ TensorFlow not installed!")
    print("   Install with: pip install tensorflow")
    TF_AVAILABLE = False
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

# Configuration
DATA_X_FILE = '../artifacts/timeseries_X_multioutput.npy'
DATA_Y_FILE = '../artifacts/timeseries_y_multioutput.npy'
MODEL_FILE = '../wave_forecast_multioutput_lstm.keras'  # Save to root (production file)
SCALER_X_FILE = '../wave_forecast_scaler_X_multioutput.joblib'  # Save to root (production file)
SCALER_Y_FILE = '../wave_forecast_scaler_y_multioutput.joblib'  # Save to root (production file)
FEATURE_NAMES_FILE = '../wave_forecast_feature_names.joblib'  # Save to root (production file)

FEATURE_NAMES = ['Wave Height (m)', 'Wave Period (s)', 'Swell Height (m)', 
                 'Swell Period (s)', 'Wind Speed (m/s)', 'Wind Direction (°)']

def load_data():
    """Load prepared time-series data"""
    print("=" * 60)
    print("LOADING DATA")
    print("=" * 60)
    
    if not os.path.exists(DATA_X_FILE) or not os.path.exists(DATA_Y_FILE):
        print(f"\n❌ Error: Data files not found!")
        print(f"   Expected: {DATA_X_FILE} and {DATA_Y_FILE}")
        print(f"   Run prepare_timeseries_data.py first!")
        return None, None
    
    X = np.load(DATA_X_FILE)
    y = np.load(DATA_Y_FILE)
    
    print(f"\n✅ Loaded data:")
    print(f"   X shape: {X.shape}  (samples, 168 hours input, 6 features)")
    print(f"   y shape: {y.shape}  (samples, 168 hours output, 6 features)")
    
    return X, y


def validate_and_clean_data(X, y):
    """Validate data and clean NaN/Inf values"""
    print("\n" + "=" * 60)
    print("VALIDATING AND CLEANING DATA")
    print("=" * 60)
    
    # Check for NaN/Inf values
    print(f"Checking for bad values...")
    print(f"  X contains NaN: {np.isnan(X).any()}")
    print(f"  X contains Inf: {np.isinf(X).any()}")
    print(f"  y contains NaN: {np.isnan(y).any()}")
    print(f"  y contains Inf: {np.isinf(y).any()}")
    
    # Replace NaN/Inf with reasonable defaults
    if np.isnan(X).any() or np.isinf(X).any():
        print("⚠️  Found NaN/Inf in X - replacing with column medians...")
        for i in range(X.shape[2]):  # For each feature
            feature_data = X[:, :, i]
            median_val = np.nanmedian(feature_data)
            X[:, :, i] = np.where(np.isnan(feature_data) | np.isinf(feature_data), 
                                   median_val, feature_data)
    
    if np.isnan(y).any() or np.isinf(y).any():
        print("⚠️  Found NaN/Inf in y - replacing with column medians...")
        for i in range(y.shape[2]):
            feature_data = y[:, :, i]
            median_val = np.nanmedian(feature_data)
            y[:, :, i] = np.where(np.isnan(feature_data) | np.isinf(feature_data), 
                                   median_val, feature_data)
    
    print("✅ Data cleaned")
    
    # Show data statistics
    print(f"\nData Statistics:")
    for i, feature in enumerate(['Wave Height', 'Wave Period', 'Swell Height', 
                                  'Swell Period', 'Wind Speed', 'Wind Direction']):
        print(f"  {feature}:")
        print(f"    Min: {X[:, :, i].min():.2f}, Max: {X[:, :, i].max():.2f}, "
              f"Mean: {X[:, :, i].mean():.2f}")
    
    return X, y


def scale_data(X, y):
    """Scale features independently with validation"""
    print("\n" + "=" * 60)
    print("SCALING DATA")
    print("=" * 60)
    
    n_samples, n_timesteps_in, n_features_in = X.shape
    _, n_timesteps_out, n_features_out = y.shape
    
    # Create separate scalers for each feature dimension
    scaler_X = StandardScaler()
    scaler_y = StandardScaler()
    
    # Reshape for scaling: (samples * timesteps, features)
    X_reshaped = X.reshape(-1, n_features_in)
    y_reshaped = y.reshape(-1, n_features_out)
    
    print(f"Fitting scalers...")
    print(f"  X range before scaling: [{X_reshaped.min():.2f}, {X_reshaped.max():.2f}]")
    print(f"  y range before scaling: [{y_reshaped.min():.2f}, {y_reshaped.max():.2f}]")
    
    # Fit and transform
    X_scaled_flat = scaler_X.fit_transform(X_reshaped)
    y_scaled_flat = scaler_y.fit_transform(y_reshaped)
    
    print(f"  X range after scaling: [{X_scaled_flat.min():.2f}, {X_scaled_flat.max():.2f}]")
    print(f"  y range after scaling: [{y_scaled_flat.min():.2f}, {y_scaled_flat.max():.2f}]")
    
    # Reshape back
    X_scaled = X_scaled_flat.reshape(n_samples, n_timesteps_in, n_features_in)
    y_scaled = y_scaled_flat.reshape(n_samples, n_timesteps_out, n_features_out)
    
    # Final validation - check for NaN after scaling
    if np.isnan(X_scaled).any() or np.isnan(y_scaled).any():
        print("❌ ERROR: NaN values found after scaling!")
        print("   This indicates a problem with the input data.")
        return None, None, None, None
    
    print("✅ Data scaled successfully using StandardScaler")
    
    return X_scaled, y_scaled, scaler_X, scaler_y


def build_model(n_timesteps_in, n_timesteps_out, n_features):
    """Build Multi-Output LSTM with gradient clipping (Sequence-to-Sequence)"""
    print("\n" + "=" * 60)
    print("BUILDING MODEL ARCHITECTURE")
    print("=" * 60)
    
    model = Sequential([
        # Encoder: Process input sequence (REDUCED SIZE to prevent overfitting)
        LSTM(64, activation='tanh', return_sequences=True, 
             input_shape=(n_timesteps_in, n_features),
             name='encoder_lstm_1'),
        Dropout(0.3, name='encoder_dropout_1'),
        
        LSTM(32, activation='tanh', return_sequences=False,
             name='encoder_lstm_2'),
        Dropout(0.3, name='encoder_dropout_2'),
        
        # Repeat the encoded context for each output timestep
        RepeatVector(n_timesteps_out, name='repeat_vector'),
        
        # Decoder: Generate output sequence (REDUCED SIZE)
        LSTM(32, activation='tanh', return_sequences=True,
             name='decoder_lstm_1'),
        Dropout(0.3, name='decoder_dropout_1'),
        
        LSTM(16, activation='tanh', return_sequences=True,
             name='decoder_lstm_2'),
        Dropout(0.3, name='decoder_dropout_2'),
        
        # Output layer: Predict all 6 features for each timestep
        TimeDistributed(Dense(n_features), name='output_layer')
    ])
    
    # Compile with gradient clipping to prevent explosion
    optimizer = tf.keras.optimizers.Adam(
        learning_rate=0.001,
        clipnorm=1.0  # CRITICAL: Clip gradients to prevent explosion
    )
    
    model.compile(
        optimizer=optimizer,
        loss='mse',
        metrics=['mae']
    )
    
    print("\n📊 Model Architecture:")
    model.summary()
    
    return model


def train_model(model, X_train, y_train, X_test, y_test):
    """Train the LSTM model with NaN detection"""
    print("\n" + "=" * 60)
    print("TRAINING MODEL")
    print("=" * 60)
    
    # Callbacks
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True,
        verbose=1
    )
    
    # CRITICAL: Stop training if NaN loss detected
    nan_callback = tf.keras.callbacks.TerminateOnNaN()
    
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=5,
        min_lr=0.00001,
        verbose=1
    )
    
    checkpoint = ModelCheckpoint(
        MODEL_FILE,
        monitor='val_loss',
        save_best_only=True,
        verbose=1
    )
    
    print("\n🔄 Starting training with NaN detection...")
    # Train
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=32,
        callbacks=[early_stop, nan_callback, reduce_lr, checkpoint],
        verbose=1
    )
    
    return history


def evaluate_model(model, X_test, y_test, scaler_y):
    """Evaluate the trained model with MAPE"""
    print("\n" + "=" * 60)
    print("EVALUATING MODEL")
    print("=" * 60)
    
    test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n📈 Test Loss (MSE): {test_loss:.4f}")
    print(f"📈 Test MAE (scaled): {test_mae:.4f}")
    
    # Get real-world MAE for each parameter
    print(f"\n{'=' * 60}")
    print("REAL-WORLD PERFORMANCE (per parameter)")
    print('=' * 60)
    
    # Predict on test set (sample first 100 for speed)
    n_samples = min(100, len(X_test))
    y_pred_scaled = model.predict(X_test[:n_samples], verbose=0)
    
    # Inverse transform
    n_timesteps_out = y_test.shape[1]
    n_features = y_test.shape[2]
    
    y_pred = scaler_y.inverse_transform(
        y_pred_scaled.reshape(-1, n_features)
    ).reshape(-1, n_timesteps_out, n_features)
    
    y_true = scaler_y.inverse_transform(
        y_test[:n_samples].reshape(-1, n_features)
    ).reshape(-1, n_timesteps_out, n_features)
    
    # Calculate MAE and MAPE for each parameter
    epsilon = 1e-10
    for i, name in enumerate(FEATURE_NAMES):
        mae = np.mean(np.abs(y_pred[:, :, i] - y_true[:, :, i]))
        mape = np.mean(np.abs((y_pred[:, :, i] - y_true[:, :, i]) / (y_true[:, :, i] + epsilon))) * 100
        print(f"  {name:25s}: MAE = {mae:7.3f}, MAPE = {mape:6.2f}%")
    
    return y_pred, y_true


def plot_training_history(history):
    """Plot and save training history"""
    print(f"\n{'=' * 60}")
    print("SAVING TRAINING PLOTS")
    print('=' * 60)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss plot
    ax1.plot(history.history['loss'], label='Train Loss', linewidth=2)
    ax1.plot(history.history['val_loss'], label='Val Loss', linewidth=2)
    ax1.set_title('Model Loss Over Time', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch', fontsize=12)
    ax1.set_ylabel('Loss (MSE)', fontsize=12)
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    
    # MAE plot
    ax2.plot(history.history['mae'], label='Train MAE', linewidth=2)
    ax2.plot(history.history['val_mae'], label='Val MAE', linewidth=2)
    ax2.set_title('Model MAE Over Time', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch', fontsize=12)
    ax2.set_ylabel('MAE', fontsize=12)
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('../artifacts/training_history_multioutput.png', dpi=150, bbox_inches='tight')
    print("✅ Saved: ../artifacts/training_history_multioutput.png")


def plot_sample_predictions(y_pred, y_true):
    """Plot sample predictions vs actual"""
    print("✅ Generating sample prediction plots...")
    
    # Plot first prediction sample
    fig, axes = plt.subplots(3, 2, figsize=(14, 10))
    axes = axes.flatten()
    
    hours = np.arange(168)
    
    for i, (name, ax) in enumerate(zip(FEATURE_NAMES, axes)):
        ax.plot(hours, y_true[0, :, i], label='Actual', linewidth=2, marker='o', 
                markersize=3, alpha=0.7)
        ax.plot(hours, y_pred[0, :, i], label='Predicted', linewidth=2, marker='x', 
                markersize=3, alpha=0.7)
        ax.set_title(name, fontsize=12, fontweight='bold')
        ax.set_xlabel('Hour', fontsize=10)
        ax.set_ylabel('Value', fontsize=10)
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('../artifacts/sample_predictions.png', dpi=150, bbox_inches='tight')
    print("✅ Saved: ../artifacts/sample_predictions.png")


def main():
    """Main training pipeline"""
    print("\n" + "=" * 70)
    print(" " * 10 + "🌊 7-DAY SURF FORECAST MODEL TRAINING 🌊")
    print("=" * 70)
    
    if not TF_AVAILABLE:
        return
    
    # 1. Load data
    X, y = load_data()
    if X is None or y is None:
        return
    
    # 2. Validate and clean data
    print("\n" + "=" * 60)
    print("VALIDATING AND CLEANING DATA")
    print("=" * 60)
    
    X_clean, y_clean = validate_and_clean_data(X, y)
    if X_clean is None or y_clean is None:
        print("❌ Data cleaning failed. Aborting training.")
        return
    
    # 3. Scale data
    X_scaled, y_scaled, scaler_X, scaler_y = scale_data(X_clean, y_clean)
    if X_scaled is None:
        print("❌ Data scaling failed. Aborting training.")
        return
    
    # 4. Train/test split
    print("\n" + "=" * 60)
    print("SPLITTING DATA")
    print("=" * 60)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_scaled, test_size=0.2, random_state=42
    )
    
    print(f"\n✅ Training set: {X_train.shape[0]} samples")
    print(f"✅ Test set: {X_test.shape[0]} samples")
    
    # 5. Build model
    n_timesteps_in = X_train.shape[1]
    n_timesteps_out = y_train.shape[1]
    n_features = X_train.shape[2]
    
    model = build_model(n_timesteps_in, n_timesteps_out, n_features)
    
    # 6. Train model
    history = train_model(model, X_train, y_train, X_test, y_test)
    
    # 7. Evaluate model
    y_pred, y_true = evaluate_model(model, X_test, y_test, scaler_y)
    
    # 8. Save scalers and metadata
    print(f"\n{'=' * 60}")
    print("SAVING MODEL ARTIFACTS")
    print('=' * 60)
    
    joblib.dump(scaler_X, SCALER_X_FILE)
    joblib.dump(scaler_y, SCALER_Y_FILE)
    joblib.dump(FEATURE_NAMES, FEATURE_NAMES_FILE)
    
    print(f"✅ Saved: {MODEL_FILE}")
    print(f"✅ Saved: {SCALER_X_FILE}")
    print(f"✅ Saved: {SCALER_Y_FILE}")
    print(f"✅ Saved: {FEATURE_NAMES_FILE}")
    
    # 9. Show sample prediction
    print(f"\n{'=' * 60}")
    print("SAMPLE PREDICTION (First Test Sample)")
    print('=' * 60)
    
    sample_pred = y_pred[0]  # First prediction (168 hours x 6 features)
    sample_true = y_true[0]
    
    print("\nPredicted 7-Day Forecast (hourly averages):")
    for i, name in enumerate(FEATURE_NAMES):
        pred_avg = np.mean(sample_pred[:, i])
        true_avg = np.mean(sample_true[:, i])
        error = abs(pred_avg - true_avg)
        print(f"  {name:25s}: Pred={pred_avg:7.3f}, True={true_avg:7.3f}, Error={error:7.3f}")
    
    # 8. Generate plots
    plot_training_history(history)
    plot_sample_predictions(y_pred, y_true)
    
    # Final summary
    print("\n" + "=" * 70)
    print(" " * 20 + "✅ TRAINING COMPLETE!")
    print("=" * 70)
    print("\nGenerated files:")
    print(f"  📁 {MODEL_FILE}")
    print(f"  📁 {SCALER_X_FILE}")
    print(f"  📁 {SCALER_Y_FILE}")
    print(f"  📁 {FEATURE_NAMES_FILE}")
    print(f"  📊 ../artifacts/training_history_multioutput.png")
    print(f"  📊 ../artifacts/sample_predictions.png")
    print(f"\nNext step: Use forecast_7day_service.py to generate predictions")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Training interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during training: {e}")
        import traceback
        traceback.print_exc()
