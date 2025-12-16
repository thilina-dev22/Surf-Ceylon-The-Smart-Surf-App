const Session = require('../models/Session');
const User = require('../models/User');

/**
 * Start a new surf session
 */
exports.startSession = async (req, res) => {
  // Check if MongoDB is available
  if (!req.isMongoConnected) {
    return res.status(503).json({ 
      error: 'Session tracking temporarily unavailable',
      message: 'You can still use the app, but session tracking is disabled'
    });
  }

  try {
    const { 
      userId, 
      spotId, 
      spotName, 
      spotRegion,
      conditions 
    } = req.body;
    
    // Validate required fields
    if (!userId || !spotId || !spotName || !conditions) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'spotId', 'spotName', 'conditions']
      });
    }
    
    // Create new session
    const session = new Session({
      userId,
      spotId,
      spotName,
      spotRegion: spotRegion || 'Unknown',
      conditions: {
        waveHeight: conditions.waveHeight,
        wavePeriod: conditions.wavePeriod,
        windSpeed: conditions.windSpeed,
        windDirection: conditions.windDirection,
        tide: conditions.tide,
        crowdLevel: conditions.crowdLevel || 'Medium',
        timeOfDay: new Date().getHours()
      },
      startTime: new Date()
    });
    
    await session.save();
    
    console.log(`Session started: ${session._id} for user ${userId} at ${spotName}`);
    
    res.status(201).json({ 
      success: true,
      sessionId: session._id,
      message: 'Session started successfully'
    });
    
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ 
      error: 'Failed to start session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * End a surf session
 */
exports.endSession = async (req, res) => {
  // Check if MongoDB is available
  if (!req.isMongoConnected) {
    return res.status(503).json({ 
      error: 'Session tracking temporarily unavailable',
      message: 'Session could not be saved'
    });
  }

  try {
    const { sessionId } = req.params;
    const { rating, wouldReturn, comments } = req.body;
    
    // Find session
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.endTime) {
      return res.status(400).json({ error: 'Session already ended' });
    }
    
    // Update session
    session.endTime = new Date();
    session.rating = rating;
    session.wouldReturn = wouldReturn;
    session.comments = comments;
    
    // Duration and enjoyment are calculated automatically in pre-save hook
    await session.save();
    
    // Update user stats
    try {
      const user = await User.findById(session.userId);
      if (user) {
        user.stats.totalSessions += 1;
        user.stats.totalHours += (session.duration / 60);
        user.stats.lastSessionDate = session.endTime;
        await user.save();
        
        // Update learned preferences if enough sessions
        if (user.stats.totalSessions % 5 === 0) {
          await user.updateLearnedPreferences();
        }
      }
    } catch (userError) {
      console.error('Error updating user stats:', userError);
      // Continue - don't fail the session end
    }
    
    console.log(`Session ended: ${session._id}, Duration: ${session.duration} min, Rating: ${rating}`);
    
    res.json({ 
      success: true,
      session: {
        id: session._id,
        duration: session.duration,
        enjoyment: session.enjoyment,
        rating: session.rating
      },
      message: 'Session ended successfully'
    });
    
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ 
      error: 'Failed to end session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's sessions
 */
exports.getUserSessions = async (req, res) => {
  // Check if MongoDB is available
  if (!req.isMongoConnected) {
    return res.status(503).json({ 
      error: 'Session tracking temporarily unavailable',
      sessions: [], 
      total: 0 
    });
  }

  try {
    const { userId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    const sessions = await Session.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Session.countDocuments({ userId });
    
    res.json({
      sessions,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sessions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user insights
 */
exports.getUserInsights = async (req, res) => {
  // Check if MongoDB is available
  if (!req.isMongoConnected) {
    return res.status(503).json({ 
      error: 'Session tracking temporarily unavailable',
      totalSessions: 0,
      totalDuration: 0,
      averageDuration: 0,
      favoriteSpots: [],
      skillProgression: []
    });
  }

  try {
    const { userId } = req.params;
    
    const insights = await Session.getUserInsights(userId);
    
    res.json(insights);
    
  } catch (error) {
    console.error('Error getting user insights:', error);
    res.status(500).json({ 
      error: 'Failed to get user insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get spot statistics
 */
exports.getSpotStats = async (req, res) => {
  // Check if MongoDB is available
  if (!req.isMongoConnected) {
    return res.status(503).json({ 
      error: 'Session tracking temporarily unavailable',
      spotId: req.params.spotId,
      totalSessions: 0,
      message: 'Session statistics temporarily unavailable'
    });
  }

  try {
    const { spotId } = req.params;
    
    const sessions = await Session.find({ spotId });
    
    if (sessions.length === 0) {
      return res.json({
        spotId,
        totalSessions: 0,
        message: 'No sessions recorded for this spot yet'
      });
    }
    
    const avgRating = sessions.filter(s => s.rating).reduce((sum, s) => sum + s.rating, 0) / 
                      sessions.filter(s => s.rating).length;
    
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    
    // Most common crowd level
    const crowdCounts = sessions.reduce((acc, s) => {
      acc[s.conditions.crowdLevel] = (acc[s.conditions.crowdLevel] || 0) + 1;
      return acc;
    }, {});
    const mostCommonCrowd = Object.entries(crowdCounts).sort((a, b) => b[1] - a[1])[0][0];
    
    res.json({
      spotId,
      spotName: sessions[0].spotName,
      totalSessions: sessions.length,
      avgRating: avgRating.toFixed(1),
      avgDuration: Math.round(avgDuration),
      mostCommonCrowdLevel: mostCommonCrowd,
      lastSession: sessions[sessions.length - 1].createdAt
    });
    
  } catch (error) {
    console.error('Error getting spot stats:', error);
    res.status(500).json({ 
      error: 'Failed to get spot statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
