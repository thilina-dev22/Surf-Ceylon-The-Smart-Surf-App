const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const Session = require('../models/Session');
const User = require('../models/User');

/**
 * Personalization Routes - Phase 3
 * ML-powered user preference prediction
 */

// Configuration
const PYTHON_EXECUTABLE = path.resolve(__dirname, '..', '..', 'surfapp--ml-engine', 'venv', 'Scripts', 'python.exe');
const PERSONALIZATION_SCRIPT = path.resolve(__dirname, '..', '..', 'surfapp--ml-engine', 'predict_personalization.py');

/**
 * Helper: Call Python personalization model
 */
function predictPreferences(sessions) {
    return new Promise((resolve, reject) => {
        // Prepare session data for ML model
        const sessionData = sessions.map(s => ({
            waveHeight: s.conditions.waveHeight,
            wavePeriod: s.conditions.wavePeriod,
            windSpeed: s.conditions.windSpeed,
            windDirection: s.conditions.windDirection,
            crowdLevel: s.conditions.crowdLevel,
            timeOfDay: s.conditions.timeOfDay,
            duration: s.duration,
            rating: s.rating,
            enjoyment: s.enjoyment,
            wouldReturn: s.wouldReturn,
            spotId: s.spotId
        }));
        
        const jsonInput = JSON.stringify(sessionData);
        
        const pythonProcess = spawn(PYTHON_EXECUTABLE, [PERSONALIZATION_SCRIPT, jsonInput]);
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Personalization model error:', errorOutput);
                reject(new Error(`Personalization model failed with code ${code}`));
                return;
            }
            
            try {
                const result = JSON.parse(output);
                resolve(result);
            } catch (e) {
                console.error('Failed to parse personalization output:', output);
                reject(new Error('Invalid personalization model output'));
            }
        });
    });
}

// GET /api/personalization/user/:userId - Get predicted preferences
router.get('/user/:userId', async (req, res) => {
    // Check if MongoDB is available
    if (!req.isMongoConnected) {
        return res.status(503).json({ 
            error: 'Personalization temporarily unavailable',
            message: 'MongoDB connection required for ML predictions'
        });
    }

    try {
        const { userId } = req.params;
        const { minSessions = 5 } = req.query;
        
        // Fetch user's sessions
        const sessions = await Session.find({ userId })
            .sort({ createdAt: -1 })
            .limit(100);  // Use last 100 sessions max
        
        if (sessions.length < minSessions) {
            return res.status(400).json({
                error: 'Insufficient session history',
                message: `Need at least ${minSessions} sessions for predictions, found ${sessions.length}`,
                currentSessions: sessions.length,
                requiredSessions: minSessions
            });
        }
        
        // Get ML predictions
        const predictions = await predictPreferences(sessions);
        
        // Update user's learned preferences
        const user = await User.findById(userId);
        if (user) {
            user.learnedPreferences = {
                skillLevel: predictions.skillLevel,
                preferredWaveHeight: predictions.preferredWaveHeight,
                preferredWindSpeed: predictions.preferredWindSpeed,
                lastUpdated: new Date(),
                confidence: predictions.confidence.skill
            };
            await user.save();
        }
        
        res.json({
            userId,
            predictions,
            sessionCount: sessions.length,
            message: 'Preferences predicted successfully'
        });
        
    } catch (error) {
        console.error('Error predicting preferences:', error);
        res.status(500).json({
            error: 'Failed to predict preferences',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/personalization/user/:userId/effective - Get effective preferences (manual + learned)
router.get('/user/:userId/effective', async (req, res) => {
    // Check if MongoDB is available
    if (!req.isMongoConnected) {
        return res.status(503).json({ 
            error: 'Personalization temporarily unavailable',
            message: 'MongoDB connection required'
        });
    }

    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const effectivePreferences = user.getEffectivePreferences();
        
        res.json({
            userId,
            preferences: effectivePreferences,
            hasLearnedPreferences: !!user.learnedPreferences.skillLevel,
            lastUpdated: user.learnedPreferences.lastUpdated
        });
        
    } catch (error) {
        console.error('Error getting effective preferences:', error);
        res.status(500).json({
            error: 'Failed to get preferences',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/personalization/user/:userId/retrain - Trigger preference update
router.post('/user/:userId/retrain', async (req, res) => {
    // Check if MongoDB is available
    if (!req.isMongoConnected) {
        return res.status(503).json({ 
            error: 'Personalization temporarily unavailable',
            message: 'MongoDB connection required'
        });
    }

    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update learned preferences
        await user.updateLearnedPreferences();
        await user.save();
        
        res.json({
            success: true,
            userId,
            learnedPreferences: user.learnedPreferences,
            message: 'Preferences updated successfully'
        });
        
    } catch (error) {
        console.error('Error retraining preferences:', error);
        res.status(500).json({
            error: 'Failed to retrain preferences',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/personalization/recommendations/:userId/:spotId - Get personalized spot recommendations
router.get('/recommendations/:userId/:spotId', async (req, res) => {
    // Check if MongoDB is available
    if (!req.isMongoConnected) {
        return res.status(503).json({ 
            error: 'Personalization temporarily unavailable',
            message: 'MongoDB connection required'
        });
    }

    try {
        const { userId, spotId } = req.params;
        
        // Get user's effective preferences
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const preferences = user.getEffectivePreferences();
        
        // Get user's session history at this spot
        const spotSessions = await Session.find({ userId, spotId })
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Calculate personalized insights
        const insights = {
            totalVisits: spotSessions.length,
            avgRating: spotSessions.length > 0 
                ? spotSessions.reduce((sum, s) => sum + s.rating, 0) / spotSessions.length 
                : null,
            lastVisit: spotSessions.length > 0 ? spotSessions[0].createdAt : null,
            wouldReturnRate: spotSessions.length > 0
                ? spotSessions.filter(s => s.wouldReturn).length / spotSessions.length
                : null,
            bestConditions: spotSessions.length > 0 ? {
                waveHeight: spotSessions
                    .filter(s => s.rating >= 4)
                    .reduce((sum, s) => sum + s.conditions.waveHeight, 0) / 
                    spotSessions.filter(s => s.rating >= 4).length || null,
                windSpeed: spotSessions
                    .filter(s => s.rating >= 4)
                    .reduce((sum, s) => sum + s.conditions.windSpeed, 0) / 
                    spotSessions.filter(s => s.rating >= 4).length || null
            } : null,
            recommendation: spotSessions.length >= 3
                ? spotSessions.filter(s => s.rating >= 4).length / spotSessions.length > 0.6
                    ? 'Highly Recommended'
                    : spotSessions.filter(s => s.rating >= 4).length / spotSessions.length > 0.3
                        ? 'Recommended'
                        : 'Not Recommended'
                : 'Insufficient Data'
        };
        
        res.json({
            userId,
            spotId,
            preferences,
            insights
        });
        
    } catch (error) {
        console.error('Error getting personalized recommendations:', error);
        res.status(500).json({
            error: 'Failed to get recommendations',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
