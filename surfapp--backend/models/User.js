const mongoose = require('mongoose');

/**
 * User Schema - Phase 2
 * Stores user profiles and preferences
 */
const userSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  
  // Surfing profile
  skillLevel: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  
  // Preferences (can be updated based on session history)
  preferences: {
    minWaveHeight: { type: Number, default: 0.5 }, // meters
    maxWaveHeight: { type: Number, default: 2.0 }, // meters
    preferredWindSpeed: { type: Number, default: 15 },   // km/h
    preferredRegion: { type: String },
    boardType: { 
      type: String, 
      enum: ['Soft-top', 'Longboard', 'Funboard', 'Shortboard'],
      default: 'Soft-top'
    },
    tidePreference: {
      type: String,
      enum: ['Low', 'Mid', 'High', 'Any'],
      default: 'Any'
    }
  },
  
  // Learning preferences from session data
  learnedPreferences: {
    enabled: { type: Boolean, default: true },
    lastUpdated: { type: Date },
    confidence: { type: Number, min: 0, max: 100, default: 0 }, // Confidence in learned preferences
    data: {
      preferredWaveHeight: Number,
      preferredWindSpeed: Number,
      preferredTimeOfDay: Number,
      preferredCrowdLevel: String
    }
  },
  
  // Stats
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    favoriteSpot: { type: String },
    lastSessionDate: { type: Date }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to update learned preferences from session data
userSchema.methods.updateLearnedPreferences = async function() {
  if (!this.learnedPreferences.enabled) {
    return;
  }
  
  const Session = mongoose.model('Session');
  const preferredConditions = await Session.getPreferredConditions(this._id);
  
  if (preferredConditions && preferredConditions.sampleSize >= 5) {
    this.learnedPreferences.data = {
      preferredWaveHeight: parseFloat(preferredConditions.preferredWaveHeight),
      preferredWindSpeed: parseFloat(preferredConditions.preferredWindSpeed)
    };
    this.learnedPreferences.lastUpdated = new Date();
    this.learnedPreferences.confidence = Math.min(100, preferredConditions.sampleSize * 10);
    
    await this.save();
  }
};

// Method to get effective preferences (manual or learned)
userSchema.methods.getEffectivePreferences = function() {
  const base = {
    skillLevel: this.skillLevel,
    preferredWaveHeight: this.preferences.preferredWaveHeight,
    preferredWindSpeed: this.preferences.preferredWindSpeed,
    preferredRegion: this.preferences.preferredRegion,
    boardType: this.preferences.boardType,
    tidePreference: this.preferences.tidePreference
  };
  
  // Use learned preferences if confidence is high enough and enabled
  if (this.learnedPreferences.enabled && 
      this.learnedPreferences.confidence >= 50 &&
      this.learnedPreferences.data) {
    
    return {
      ...base,
      preferredWaveHeight: this.learnedPreferences.data.preferredWaveHeight || base.preferredWaveHeight,
      preferredWindSpeed: this.learnedPreferences.data.preferredWindSpeed || base.preferredWindSpeed,
      usingLearnedPreferences: true,
      confidence: this.learnedPreferences.confidence
    };
  }
  
  return {
    ...base,
    usingLearnedPreferences: false
  };
};

module.exports = mongoose.model('User', userSchema);
