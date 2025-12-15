const mongoose = require('mongoose');

/**
 * Session Schema - Phase 2
 * Tracks user surf sessions for data collection and analytics
 */
const sessionSchema = new mongoose.Schema({
  // User identification
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Spot information
  spotId: { type: String, required: true, index: true },
  spotName: { type: String, required: true },
  spotRegion: { type: String, required: true },
  
  // Conditions during the session
  conditions: {
    waveHeight: { type: Number, required: true }, // meters
    wavePeriod: { type: Number, required: true }, // seconds
    windSpeed: { type: Number, required: true },  // km/h
    windDirection: { type: Number, required: true }, // degrees
    tide: { type: String, enum: ['Low', 'Mid', 'High'], required: true },
    crowdLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    timeOfDay: { type: Number, min: 0, max: 23, required: true } // hour (0-23)
  },
  
  // Session metadata
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // minutes (auto-calculated)
  
  // User feedback
  rating: { 
    type: Number, 
    min: 1, 
    max: 5,
    required: function() { return this.endTime != null; }
  },
  enjoyment: { type: Number, min: 0, max: 100 }, // Auto-calculated from duration
  wouldReturn: { type: Boolean },
  comments: { type: String, maxlength: 500 },
  
  // Auto-tracked metrics
  returnVisits: { type: Number, default: 0 }, // How many times user returned to this spot
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ spotId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, spotId: 1 });

// Calculate enjoyment score from duration before saving
sessionSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Calculate duration if endTime is set
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 60000); // Convert to minutes
    
    // Calculate enjoyment score based on duration
    // 30 min = 50%, 60 min = 75%, 90+ min = 100%
    if (!this.enjoyment) {
      if (this.duration >= 90) {
        this.enjoyment = 100;
      } else if (this.duration >= 60) {
        this.enjoyment = 75;
      } else if (this.duration >= 30) {
        this.enjoyment = Math.round(50 + ((this.duration - 30) / 30) * 25);
      } else {
        this.enjoyment = Math.round((this.duration / 30) * 50);
      }
    }
  }
  
  next();
});

// Static method to get user's favorite spots
sessionSchema.statics.getFavoriteSpots = async function(userId, limit = 5) {
  const result = await this.aggregate([
    { $match: { userId: userId } },
    { 
      $group: {
        _id: '$spotId',
        spotName: { $first: '$spotName' },
        visitCount: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        avgEnjoyment: { $avg: '$enjoyment' },
        avgDuration: { $avg: '$duration' },
        lastVisit: { $max: '$createdAt' }
      }
    },
    { 
      $addFields: {
        favoriteScore: {
          $add: [
            { $multiply: ['$visitCount', 10] },
            { $multiply: ['$avgRating', 15] },
            { $multiply: ['$avgEnjoyment', 0.5] }
          ]
        }
      }
    },
    { $sort: { favoriteScore: -1 } },
    { $limit: limit }
  ]);
  
  return result;
};

// Static method to analyze user's preferred conditions
sessionSchema.statics.getPreferredConditions = async function(userId) {
  const sessions = await this.find({ userId, rating: { $gte: 4 } }); // Only highly rated sessions
  
  if (sessions.length === 0) {
    return null;
  }
  
  // Calculate averages of enjoyed sessions
  const totals = sessions.reduce((acc, session) => ({
    waveHeight: acc.waveHeight + session.conditions.waveHeight,
    wavePeriod: acc.wavePeriod + session.conditions.wavePeriod,
    windSpeed: acc.windSpeed + session.conditions.windSpeed,
    count: acc.count + 1
  }), { waveHeight: 0, wavePeriod: 0, windSpeed: 0, count: 0 });
  
  return {
    preferredWaveHeight: (totals.waveHeight / totals.count).toFixed(2),
    preferredWavePeriod: (totals.wavePeriod / totals.count).toFixed(1),
    preferredWindSpeed: (totals.windSpeed / totals.count).toFixed(1),
    sampleSize: sessions.length
  };
};

// Static method to get best time of day for user
sessionSchema.statics.getBestTimeOfDay = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: userId, rating: { $gte: 4 } } },
    { 
      $group: {
        _id: '$conditions.timeOfDay',
        avgRating: { $avg: '$rating' },
        avgEnjoyment: { $avg: '$enjoyment' },
        sessionCount: { $sum: 1 }
      }
    },
    { $sort: { avgRating: -1, avgEnjoyment: -1 } },
    { $limit: 3 }
  ]);
  
  return result.map(r => ({
    hour: r._id,
    timeRange: `${r._id}:00 - ${r._id + 1}:00`,
    avgRating: r.avgRating.toFixed(1),
    sessionCount: r.sessionCount
  }));
};

// Static method to get user insights
sessionSchema.statics.getUserInsights = async function(userId) {
  const sessions = await this.find({ userId });
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      message: 'No sessions recorded yet. Start tracking your surf sessions!'
    };
  }
  
  const favoriteSpots = await this.getFavoriteSpots(userId, 3);
  const preferredConditions = await this.getPreferredConditions(userId);
  const bestTimes = await this.getBestTimeOfDay(userId);
  
  const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
  const avgRating = sessions.filter(s => s.rating).reduce((sum, s) => sum + s.rating, 0) / 
                    sessions.filter(s => s.rating).length;
  
  return {
    totalSessions: sessions.length,
    avgSessionDuration: Math.round(avgDuration),
    avgRating: avgRating ? avgRating.toFixed(1) : null,
    favoriteSpots,
    preferredConditions,
    bestTimesOfDay: bestTimes,
    lastSession: sessions[sessions.length - 1].createdAt
  };
};

module.exports = mongoose.model('Session', sessionSchema);
