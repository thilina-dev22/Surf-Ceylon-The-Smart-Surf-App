"""
Personalization Model Training Script - Phase 3
Train ML model to predict user preferences based on session history
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import joblib
import json
import sys
from datetime import datetime

# --- CONFIGURATION ---
MIN_SESSIONS_FOR_TRAINING = 10  # Minimum sessions needed per user
PREFERENCE_MODEL_PATH = 'preference_model.joblib'
ENCODERS_PATH = 'preference_encoders.joblib'

class PersonalizationModelTrainer:
    """Trains ML models to predict user preferences from session data"""
    
    def __init__(self):
        self.skill_classifier = None
        self.wave_regressor = None
        self.wind_regressor = None
        self.encoders = {}
        
    def prepare_training_data(self, sessions_df):
        """
        Convert session data to ML features
        
        Input: DataFrame with session records
        Output: Feature matrix X and target variables y
        """
        print(f"Preparing training data from {len(sessions_df)} sessions...")
        
        # Feature Engineering
        features = pd.DataFrame()
        
        # Session Features
        features['avg_wave_height'] = sessions_df.groupby('userId')['conditions.waveHeight'].transform('mean')
        features['avg_wave_period'] = sessions_df.groupby('userId')['conditions.wavePeriod'].transform('mean')
        features['avg_wind_speed'] = sessions_df.groupby('userId')['conditions.windSpeed'].transform('mean')
        features['wave_height_variance'] = sessions_df.groupby('userId')['conditions.waveHeight'].transform('std').fillna(0)
        features['period_variance'] = sessions_df.groupby('userId')['conditions.wavePeriod'].transform('std').fillna(0)
        
        # Preferences from high-rated sessions (rating >= 4)
        features['prefers_high_waves'] = sessions_df.groupby('userId').apply(
            lambda x: (x[x['rating'] >= 4]['conditions.waveHeight'].mean() > x['conditions.waveHeight'].median())
        ).reset_index(drop=True).astype(int)
        
        features['prefers_long_period'] = sessions_df.groupby('userId').apply(
            lambda x: (x[x['rating'] >= 4]['conditions.wavePeriod'].mean() > x['conditions.wavePeriod'].median())
        ).reset_index(drop=True).astype(int)
        
        features['prefers_low_wind'] = sessions_df.groupby('userId').apply(
            lambda x: (x[x['rating'] >= 4]['conditions.windSpeed'].mean() < x['conditions.windSpeed'].median())
        ).reset_index(drop=True).astype(int)
        
        # Session patterns
        features['total_sessions'] = sessions_df.groupby('userId')['userId'].transform('count')
        features['avg_duration'] = sessions_df.groupby('userId')['duration'].transform('mean')
        features['avg_rating'] = sessions_df.groupby('userId')['rating'].transform('mean')
        features['avg_enjoyment'] = sessions_df.groupby('userId')['enjoyment'].transform('mean')
        features['would_return_rate'] = sessions_df.groupby('userId')['wouldReturn'].transform('mean')
        
        # Crowd tolerance
        crowd_encoder = LabelEncoder()
        sessions_df['crowd_encoded'] = crowd_encoder.fit_transform(sessions_df['conditions.crowdLevel'])
        features['avg_crowd_level'] = sessions_df.groupby('userId')['crowd_encoded'].transform('mean')
        self.encoders['crowd'] = crowd_encoder
        
        # Time preferences
        features['preferred_time_of_day'] = sessions_df.groupby('userId')['conditions.timeOfDay'].transform(
            lambda x: x.mode()[0] if len(x.mode()) > 0 else x.mean()
        )
        
        # Spot preferences
        spot_encoder = LabelEncoder()
        sessions_df['spot_encoded'] = spot_encoder.fit_transform(sessions_df['spotId'])
        features['favorite_spot'] = sessions_df.groupby('userId')['spot_encoded'].transform(
            lambda x: x.mode()[0] if len(x.mode()) > 0 else x.mean()
        )
        self.encoders['spot'] = spot_encoder
        
        # Drop duplicate rows (keep one row per user)
        features_unique = features.drop_duplicates()
        
        print(f"Created {len(features_unique)} unique user profiles with {features_unique.shape[1]} features")
        
        return features_unique
    
    def train_skill_classifier(self, X, y_skill):
        """Train model to predict skill level from session patterns"""
        print("\n--- Training Skill Level Classifier ---")
        
        # Encode skill levels
        skill_encoder = LabelEncoder()
        y_skill_encoded = skill_encoder.fit_transform(y_skill)
        self.encoders['skill'] = skill_encoder
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_skill_encoded, test_size=0.2, random_state=42, stratify=y_skill_encoded
        )
        
        # Train Random Forest Classifier
        self.skill_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced'
        )
        
        self.skill_classifier.fit(X_train, y_train)
        
        # Evaluate
        train_acc = self.skill_classifier.score(X_train, y_train)
        test_acc = self.skill_classifier.score(X_test, y_test)
        
        print(f"Train Accuracy: {train_acc:.3f}")
        print(f"Test Accuracy: {test_acc:.3f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.skill_classifier, X, y_skill_encoded, cv=5)
        print(f"Cross-validation Accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        # Classification report
        y_pred = self.skill_classifier.predict(X_test)
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=skill_encoder.classes_))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': self.skill_classifier.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 5 Features for Skill Prediction:")
        print(feature_importance.head())
        
        return test_acc
    
    def train_wave_preference_regressor(self, X, y_wave):
        """Train model to predict preferred wave height"""
        print("\n--- Training Wave Height Preference Regressor ---")
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_wave, test_size=0.2, random_state=42
        )
        
        # Train Random Forest Regressor
        self.wave_regressor = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        
        self.wave_regressor.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.wave_regressor.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        print(f"R² Score: {r2:.3f}")
        print(f"RMSE: {rmse:.3f} meters")
        
        # Cross-validation
        cv_scores = cross_val_score(self.wave_regressor, X, y_wave, cv=5, 
                                     scoring='r2')
        print(f"Cross-validation R²: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        return r2
    
    def train_wind_preference_regressor(self, X, y_wind):
        """Train model to predict preferred wind speed"""
        print("\n--- Training Wind Speed Preference Regressor ---")
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_wind, test_size=0.2, random_state=42
        )
        
        # Train Random Forest Regressor
        self.wind_regressor = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        
        self.wind_regressor.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.wind_regressor.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        print(f"R² Score: {r2:.3f}")
        print(f"RMSE: {rmse:.3f} m/s")
        
        # Cross-validation
        cv_scores = cross_val_score(self.wind_regressor, X, y_wind, cv=5, 
                                     scoring='r2')
        print(f"Cross-validation R²: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        return r2
    
    def save_models(self):
        """Save trained models and encoders"""
        print("\n--- Saving Models ---")
        
        models = {
            'skill_classifier': self.skill_classifier,
            'wave_regressor': self.wave_regressor,
            'wind_regressor': self.wind_regressor,
            'trained_at': datetime.now().isoformat(),
            'version': '1.0.0'
        }
        
        joblib.dump(models, PREFERENCE_MODEL_PATH)
        joblib.dump(self.encoders, ENCODERS_PATH)
        
        print(f"Models saved to {PREFERENCE_MODEL_PATH}")
        print(f"Encoders saved to {ENCODERS_PATH}")
    
    def predict_preferences(self, session_features):
        """
        Predict user preferences from session features
        
        Returns: dict with predicted skill level, wave height, wind speed
        """
        # Predict skill level
        skill_encoded = self.skill_classifier.predict([session_features])[0]
        skill_probs = self.skill_classifier.predict_proba([session_features])[0]
        predicted_skill = self.encoders['skill'].inverse_transform([skill_encoded])[0]
        confidence = skill_probs.max()
        
        # Predict wave preference
        predicted_wave = self.wave_regressor.predict([session_features])[0]
        
        # Predict wind preference
        predicted_wind = self.wind_regressor.predict([session_features])[0]
        
        return {
            'skillLevel': predicted_skill,
            'skillConfidence': float(confidence),
            'preferredWaveHeight': float(predicted_wave),
            'preferredWindSpeed': float(predicted_wind)
        }


def load_sessions_from_mongodb():
    """
    Load session data from MongoDB
    """
    print("Loading sessions from database...")
    
    try:
        from pymongo import MongoClient
        
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['test']
        sessions_collection = db['sessions']
        
        # Query all finished sessions
        # We only want sessions that have a rating (completed sessions)
        cursor = sessions_collection.find({
            'rating': {'$exists': True, '$ne': None}
        })
        
        sessions = list(cursor)
        
        if not sessions:
            print("No sessions found in database.")
            return pd.DataFrame()
            
        # Convert to DataFrame
        # Flatten nested 'conditions' object if necessary
        # MongoDB returns nested dicts, pandas json_normalize helps
        df = pd.json_normalize(sessions)
        
        # Rename columns to match expected format if needed
        # json_normalize creates 'conditions.waveHeight' etc. automatically
        
        print(f"Loaded {len(df)} sessions from database")
        return df
        
    except ImportError:
        print("❌ Error: pymongo not installed. Please run 'pip install pymongo'")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        return pd.DataFrame()


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("PERSONALIZATION MODEL TRAINING - PHASE 3")
    print("=" * 60)
    
    # Load session data
    sessions_df = load_sessions_from_mongodb()
    
    # Filter users with sufficient sessions
    user_session_counts = sessions_df.groupby('userId').size()
    valid_users = user_session_counts[user_session_counts >= MIN_SESSIONS_FOR_TRAINING].index
    sessions_df = sessions_df[sessions_df['userId'].isin(valid_users)]
    
    print(f"\nFiltered to {len(valid_users)} users with >= {MIN_SESSIONS_FOR_TRAINING} sessions")
    
    if len(sessions_df) < 50:
        print("\n⚠️  WARNING: Not enough data for robust training!")
        print(f"Need at least 50 sessions, found {len(sessions_df)}")
        print("Continuing with limited data for demonstration...")
    
    # Initialize trainer
    trainer = PersonalizationModelTrainer()
    
    # Prepare features
    X = trainer.prepare_training_data(sessions_df)
    
    # Extract targets (one per user) - align with X by userId
    user_targets = sessions_df.groupby('userId').agg({
        'skillLevel': lambda x: x.mode()[0] if len(x.mode()) > 0 else x.iloc[0],  # Most common skill level
        'conditions.waveHeight': lambda x: x[sessions_df.loc[x.index, 'rating'] >= 4].mean(),  # Avg wave height in good sessions
        'conditions.windSpeed': lambda x: x[sessions_df.loc[x.index, 'rating'] >= 4].mean()   # Avg wind speed in good sessions
    }).reset_index()
    
    # Ensure same number of samples - reset index and match by userId
    X_reset = X.reset_index(drop=True)
    sessions_users = sessions_df.drop_duplicates(subset='userId')['userId'].reset_index(drop=True)
    
    # Align targets with features
    y_skill = user_targets['skillLevel'].reset_index(drop=True)
    y_wave = user_targets['conditions.waveHeight'].fillna(X_reset['avg_wave_height']).reset_index(drop=True)
    y_wind = user_targets['conditions.windSpeed'].fillna(X_reset['avg_wind_speed']).reset_index(drop=True)
    
    # Ensure matching lengths
    min_len = min(len(X_reset), len(y_skill), len(y_wave), len(y_wind))
    X_aligned = X_reset.iloc[:min_len]
    y_skill_aligned = y_skill.iloc[:min_len]
    y_wave_aligned = y_wave.iloc[:min_len]
    y_wind_aligned = y_wind.iloc[:min_len]
    
    print(f"\nAligned dataset: {len(X_aligned)} samples")
    
    # Train models
    skill_acc = trainer.train_skill_classifier(X_aligned, y_skill_aligned)
    wave_r2 = trainer.train_wave_preference_regressor(X_aligned, y_wave_aligned)
    wind_r2 = trainer.train_wind_preference_regressor(X_aligned, y_wind_aligned)
    
    # Save models
    trainer.save_models()
    
    # Summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"Skill Classifier Accuracy: {skill_acc:.1%}")
    print(f"Wave Preference R²: {wave_r2:.3f}")
    print(f"Wind Preference R²: {wind_r2:.3f}")
    print("\nModels ready for production use!")
    
    # Example prediction
    print("\n--- Example Prediction ---")
    example_features = X_aligned.iloc[0].values
    prediction = trainer.predict_preferences(example_features)
    print(json.dumps(prediction, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
