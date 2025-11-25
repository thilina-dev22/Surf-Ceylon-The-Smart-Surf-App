"""
Personalization Prediction Service - Phase 3
Predict user preferences based on their session history
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Model paths
PREFERENCE_MODEL_PATH = Path(__file__).parent / 'preference_model.joblib'
ENCODERS_PATH = Path(__file__).parent / 'preference_encoders.joblib'

class PersonalizationPredictor:
    """Predicts user preferences from session data"""
    
    def __init__(self):
        self.models = None
        self.encoders = None
        self.load_models()
    
    def load_models(self):
        """Load trained models"""
        try:
            self.models = joblib.load(PREFERENCE_MODEL_PATH)
            self.encoders = joblib.load(ENCODERS_PATH)
            print(f"Models loaded successfully (version {self.models.get('version', 'unknown')})", 
                  file=sys.stderr)
        except FileNotFoundError:
            print("⚠️  Models not found. Please train models first using train_personalization_model.py", 
                  file=sys.stderr)
            raise
    
    def prepare_features_from_sessions(self, sessions):
        """
        Convert raw session data to ML features
        
        Args:
            sessions: List of session objects with conditions, ratings, etc.
        
        Returns:
            Feature vector ready for prediction
        """
        if not sessions or len(sessions) == 0:
            raise ValueError("No sessions provided")
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(sessions)
        
        # Extract nested conditions
        if 'conditions' in df.columns:
            conditions_df = pd.json_normalize(df['conditions'])
            df = pd.concat([df.drop('conditions', axis=1), conditions_df], axis=1)
        
        # Calculate features (matching training pipeline)
        features = {}
        
        # Basic statistics
        features['avg_wave_height'] = df['waveHeight'].mean()
        features['avg_wave_period'] = df['wavePeriod'].mean()
        features['avg_wind_speed'] = df['windSpeed'].mean()
        features['wave_height_variance'] = df['waveHeight'].std() if len(df) > 1 else 0
        features['period_variance'] = df['wavePeriod'].std() if len(df) > 1 else 0
        
        # High-rated session preferences (rating >= 4)
        high_rated = df[df['rating'] >= 4]
        
        if len(high_rated) > 0:
            features['prefers_high_waves'] = int(high_rated['waveHeight'].mean() > df['waveHeight'].median())
            features['prefers_long_period'] = int(high_rated['wavePeriod'].mean() > df['wavePeriod'].median())
            features['prefers_low_wind'] = int(high_rated['windSpeed'].mean() < df['windSpeed'].median())
        else:
            features['prefers_high_waves'] = 0
            features['prefers_long_period'] = 0
            features['prefers_low_wind'] = 0
        
        # Session patterns
        features['total_sessions'] = len(df)
        features['avg_duration'] = df['duration'].mean()
        features['avg_rating'] = df['rating'].mean()
        features['avg_enjoyment'] = df['enjoyment'].mean()
        features['would_return_rate'] = df['wouldReturn'].mean()
        
        # Crowd tolerance (encode to numeric)
        crowd_map = {'Low': 0, 'Medium': 1, 'High': 2}
        features['avg_crowd_level'] = df['crowdLevel'].map(crowd_map).mean()
        
        # Time preferences
        features['preferred_time_of_day'] = df['timeOfDay'].mode()[0] if len(df['timeOfDay'].mode()) > 0 else df['timeOfDay'].mean()
        
        # Spot preferences (encode to numeric)
        spot_counts = df['spotId'].value_counts()
        features['favorite_spot'] = hash(spot_counts.index[0]) % 1000 if len(spot_counts) > 0 else 0
        
        # Convert to array in correct order
        feature_names = [
            'avg_wave_height', 'avg_wave_period', 'avg_wind_speed',
            'wave_height_variance', 'period_variance',
            'prefers_high_waves', 'prefers_long_period', 'prefers_low_wind',
            'total_sessions', 'avg_duration', 'avg_rating', 'avg_enjoyment',
            'would_return_rate', 'avg_crowd_level', 'preferred_time_of_day',
            'favorite_spot'
        ]
        
        feature_vector = [features[name] for name in feature_names]
        
        return np.array(feature_vector).reshape(1, -1)
    
    def predict(self, sessions):
        """
        Predict user preferences from session history
        
        Args:
            sessions: List of session dictionaries
        
        Returns:
            dict with predicted preferences
        """
        # Prepare features
        X = self.prepare_features_from_sessions(sessions)
        
        # Get models
        skill_classifier = self.models['skill_classifier']
        wave_regressor = self.models['wave_regressor']
        wind_regressor = self.models['wind_regressor']
        skill_encoder = self.encoders['skill']
        
        # Predict skill level
        skill_encoded = skill_classifier.predict(X)[0]
        skill_probs = skill_classifier.predict_proba(X)[0]
        predicted_skill = skill_encoder.inverse_transform([skill_encoded])[0]
        confidence = float(skill_probs.max())
        
        # Predict wave preference
        predicted_wave = float(wave_regressor.predict(X)[0])
        
        # Predict wind preference
        predicted_wind = float(wind_regressor.predict(X)[0])
        
        return {
            'skillLevel': predicted_skill,
            'skillConfidence': confidence,
            'preferredWaveHeight': {
                'min': max(0.5, predicted_wave - 0.5),
                'ideal': predicted_wave,
                'max': predicted_wave + 0.5
            },
            'preferredWindSpeed': {
                'min': max(0, predicted_wind - 3),
                'ideal': predicted_wind,
                'max': predicted_wind + 3
            },
            'confidence': {
                'skill': confidence,
                'wave': 0.8,  # Placeholder - can be improved with prediction intervals
                'wind': 0.8
            },
            'metadata': {
                'totalSessions': len(sessions),
                'avgRating': float(pd.DataFrame(sessions)['rating'].mean()),
                'modelVersion': self.models.get('version', 'unknown')
            }
        }


def main():
    """Command-line interface for predictions"""
    if len(sys.argv) < 2:
        print("Usage: python predict_personalization.py '<json_sessions>'", file=sys.stderr)
        print("Example: python predict_personalization.py '[{\"waveHeight\":1.5,...}]'", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse input
        sessions_json = sys.argv[1]
        sessions = json.loads(sessions_json)
        
        if not isinstance(sessions, list):
            raise ValueError("Sessions must be a JSON array")
        
        # Initialize predictor
        predictor = PersonalizationPredictor()
        
        # Make prediction
        result = predictor.predict(sessions)
        
        # Output as JSON
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Prediction error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
