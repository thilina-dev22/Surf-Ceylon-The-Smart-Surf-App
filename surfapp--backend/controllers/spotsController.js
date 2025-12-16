const { spawn } = require('child_process');
const path = require('path');
const moment = require('moment');
const { PYTHON_EXECUTABLE, SPOT_RECOMMENDER_SCRIPT } = require('../config/python');
const { getCachedData, setCachedData } = require('../config/cache');
const { getSpotMetadata } = require('../config/spotMetadata');
const EnhancedSuitabilityCalculator = require('./EnhancedSuitabilityCalculator');

const suitabilityCalculator = new EnhancedSuitabilityCalculator();

// Helper function to sanitize data
const sanitizeNumber = (value) => {
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        return 0;
    }
    return value;
};

const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return sanitizeNumber(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    
    const sanitized = {};
    for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
};

// Helper to calculate enhanced suitability
const calculateEnhancedSpots = (spotsWithPredictions, userPreferences) => {
    const SPOT_METADATA = getSpotMetadata();
    
    const enhancedSpots = spotsWithPredictions.map(spot => {
        // Merge spot metadata
        const spotWithMeta = {
            ...spot,
            ...SPOT_METADATA[spot.name]
        };
        
        // Debug: Log forecast data for first spot
        if (spot.id === '1') {
            console.log(`DEBUG - Spot "${spot.name}" forecast:`, JSON.stringify(spot.forecast, null, 2));
        }
        
        // Calculate enhanced suitability
        const enhancedResult = suitabilityCalculator.calculateEnhancedSuitability(
            spotWithMeta,
            spot.forecast,
            userPreferences,
            moment()
        );
        
        return {
            ...spot,
            suitability: enhancedResult.suitability,
            score: enhancedResult.score,
            breakdown: enhancedResult.breakdown,
            recommendations: enhancedResult.recommendations,
            weights: enhancedResult.weights,
            warnings: enhancedResult.warnings || [],
            canSurf: enhancedResult.canSurf !== undefined ? enhancedResult.canSurf : true
        };
    });
    
    return enhancedSpots;
};

// Helper to load session insights
const loadSessionInsights = async (userId) => {
    if (!userId) return null;
    
    try {
        const Session = require('../models/Session');
        const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(50);
        
        if (sessions.length < 5) return null;
        
        console.log(`Loading session insights for user ${userId} (${sessions.length} sessions)`);
        
        const insights = {};
        
        // Filter high-rated sessions (4-5 stars)
        const highRatedSessions = sessions.filter(s => s.rating >= 4);
        
        if (highRatedSessions.length > 0) {
            // Learn preferred wave height
            const waveHeights = highRatedSessions
                .map(s => s.conditions?.waveHeight)
                .filter(h => h != null && h > 0);
            
            if (waveHeights.length > 0) {
                insights.learnedWaveHeight = 
                    waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
                console.log(`  Learned wave preference: ${insights.learnedWaveHeight.toFixed(2)}m`);
            }
            
            // Learn preferred wind speed
            const windSpeeds = highRatedSessions
                .map(s => s.conditions?.windSpeed)
                .filter(w => w != null && w > 0);
            
            if (windSpeeds.length > 0) {
                insights.learnedWindSpeed = 
                    windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
                console.log(`  Learned wind preference: ${insights.learnedWindSpeed.toFixed(1)} km/h`);
            }
            
            // Get favorite spots
            const spotCounts = {};
            const spotRatings = {};
            
            sessions.forEach(s => {
                const spotName = s.spotName;
                if (spotName) {
                    spotCounts[spotName] = (spotCounts[spotName] || 0) + 1;
                    if (!spotRatings[spotName]) spotRatings[spotName] = [];
                    if (s.rating) spotRatings[spotName].push(s.rating);
                }
            });
            
            // Calculate average ratings per spot
            const favoriteSpots = Object.keys(spotCounts)
                .map(spotName => ({
                    name: spotName,
                    visitCount: spotCounts[spotName],
                    avgRating: spotRatings[spotName].length > 0 
                        ? spotRatings[spotName].reduce((a, b) => a + b) / spotRatings[spotName].length 
                        : 0
                }))
                .sort((a, b) => {
                    if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
                    return b.avgRating - a.avgRating;
                })
                .slice(0, 5)
                .map(s => s.name);
            
            insights.favoriteSpots = favoriteSpots;
            console.log(`  Favorite spots: ${favoriteSpots.join(', ')}`);
        }
        
        return insights;
    } catch (error) {
        console.error('Error loading session insights:', error.message);
        return null;
    }
};

// Main controller function
const getSpots = async (req, res) => {
    // Parse user preferences from query parameters
    const userPreferences = {
        skillLevel: req.query.skillLevel || 'Intermediate',
        preferredWaveHeight: parseFloat(req.query.preferredWaveHeight) || 1.5,
        preferredWindSpeed: parseFloat(req.query.preferredWindSpeed) || 15,
        preferredRegion: req.query.preferredRegion || null,
        minWaveHeight: parseFloat(req.query.minWaveHeight) || 0.5,
        maxWaveHeight: parseFloat(req.query.maxWaveHeight) || 2.5,
        boardType: req.query.boardType || 'Soft-top',
        tidePreference: req.query.tidePreference || 'Any'
    };

    console.log('User preferences:', userPreferences);

    // Load session-based insights if user is logged in and MongoDB is connected
    const userId = req.query.userId;
    if (userId && req.isMongoConnected) {
        const insights = await loadSessionInsights(userId);
        if (insights) {
            Object.assign(userPreferences, insights);
        }
    }

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
        console.log("Serving request from cache.");
        try {
            const enhancedSpots = calculateEnhancedSpots(cachedData, userPreferences);
            const sanitizedSpots = enhancedSpots.map(sanitizeObject);
            sanitizedSpots.sort((a, b) => b.score - a.score);
            return res.json({ spots: sanitizedSpots });
        } catch (error) {
            console.error('Error processing cached data:', error);
            // Fall through to fetch new data
        }
    }
    
    // Fetch new data from Python script
    console.log("Cache is stale or empty. Fetching new data from Python script.");
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [SPOT_RECOMMENDER_SCRIPT], {
        cwd: path.resolve(__dirname, '..', '..', 'surfapp--ml-engine')
    });

    let pythonOutput = '';
    let pythonError = '';
    let hasResponded = false;

    // Set timeout for Python process (30 seconds)
    const timeout = setTimeout(() => {
        if (!hasResponded) {
            pythonProcess.kill();
            console.error('Python process timed out');
            res.status(504).json({ error: 'ML prediction timed out' });
            hasResponded = true;
        }
    }, 30000);

    pythonProcess.stdout.on('data', (data) => pythonOutput += data.toString());
    pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
        console.log(`[PYTHON LOG]: ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        if (!hasResponded) {
            console.error('Failed to start Python process:', error);
            res.status(500).json({ error: 'Failed to start ML service', details: error.message });
            hasResponded = true;
        }
    });

    pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (hasResponded) return;
        hasResponded = true;

        console.log(`Python process exited with code: ${code}`);

        if (code !== 0) {
            console.error(`Python script failed. Code: ${code}. Error: ${pythonError}`);
            return res.status(500).json({ 
                error: 'ML prediction failed', 
                details: process.env.NODE_ENV === 'development' ? pythonError : undefined 
            });
        }

        try {
            if (!pythonOutput || pythonOutput.trim() === '') {
                throw new Error('Python script returned empty output');
            }

            const model1Result = JSON.parse(pythonOutput);
            
            if (!model1Result.spots || !Array.isArray(model1Result.spots)) {
                throw new Error('Invalid data structure from Python script');
            }

            const spotsWithPredictions = model1Result.spots;
            
            // Store in cache
            setCachedData(spotsWithPredictions);
            console.log(`Updated cache with ${spotsWithPredictions.length} spots.`);

            // Calculate enhanced suitability
            const enhancedSpots = calculateEnhancedSpots(spotsWithPredictions, userPreferences);
            const sanitizedSpots = enhancedSpots.map(sanitizeObject);
            sanitizedSpots.sort((a, b) => b.score - a.score);
            
            res.json({ spots: sanitizedSpots });
            
        } catch (error) {
            console.error('Error processing Python output or scoring:', error);
            res.status(500).json({ 
                error: 'Failed to process prediction data',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined 
            });
        }
    });
};

module.exports = {
    getSpots
};
