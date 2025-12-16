const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const EnhancedSuitabilityCalculator = require('./EnhancedSuitabilityCalculator');
const sessionRoutes = require('./routes/sessions');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection (optional - app works without it)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
let isMongoConnected = false;

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of default 30
})
.then(() => {
  console.log('✅ MongoDB connected - Session tracking enabled');
  isMongoConnected = true;
})
.catch((err) => {
  console.warn('⚠️  MongoDB connection failed - Session tracking disabled');
  console.warn('   App will still work for spot viewing and forecasts');
  console.warn('   To enable session tracking, ensure MongoDB is running');
  console.warn('   Error:', err.message);
  isMongoConnected = false;
});

// Make connection status available to routes
app.use((req, res, next) => {
  req.isMongoConnected = isMongoConnected;
  next();
});

// Initialize Enhanced Suitability Calculator
const suitabilityCalculator = new EnhancedSuitabilityCalculator();

// --- CONFIGURATION ---
const getPythonExecutable = () => {
    if (process.env.PYTHON_PATH) {
        return process.env.PYTHON_PATH;
    }
    
    const isWin = process.platform === "win32";
    const venvPath = path.resolve(__dirname, '..', 'surfapp--ml-engine', 'venv');
    
    if (isWin) {
        return path.join(venvPath, 'Scripts', 'python.exe');
    } else {
        return path.join(venvPath, 'bin', 'python');
    }
};

const PYTHON_EXECUTABLE = getPythonExecutable();
const SPOT_RECOMMENDER_SCRIPT = path.resolve(__dirname, '..', 'surfapp--ml-engine', 'spot_recommender_service.py');
const FORECAST_7DAY_SCRIPT = path.resolve(__dirname, '..', 'surfapp--ml-engine', 'forecast_7day_service.py');

// --- 🎯 OPTIMIZED CACHE FOR BETTER PERFORMANCE ---
const cache = {
    data: null,
    timestamp: null,
    // Cache data for 5 minutes to reduce ML engine load and improve performance
    CACHE_DURATION_MS: 5 * 60 * 1000, 
};

// Complete spot data with additional metadata for enhanced scoring
let SPOT_METADATA = {};

try {
    const spotsPath = path.join(__dirname, '..', 'SurfApp--frontend', 'data', 'surf_spots.json');
    const spotsData = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));
    
    // Create a lookup map by spot name
    spotsData.forEach(spot => {
        SPOT_METADATA[spot.name] = {
            bottomType: spot.bottomType,
            accessibility: spot.accessibility,
            region: spot.region
        };
    });
    console.log(`✅ Loaded metadata for ${Object.keys(SPOT_METADATA).length} spots from shared JSON`);
} catch (error) {
    console.error('❌ Error loading shared spots JSON:', error.message);
    // Fallback to hardcoded if JSON load fails
    SPOT_METADATA = {
        'Arugam Bay': { bottomType: 'Sand', accessibility: 'Medium', region: 'East Coast' },
        'Weligama': { bottomType: 'Sand', accessibility: 'High', region: 'South Coast' },
        'Hikkaduwa': { bottomType: 'Reef', accessibility: 'High', region: 'South Coast' },
        'Midigama': { bottomType: 'Reef', accessibility: 'Medium', region: 'South Coast' },
        'Hiriketiya': { bottomType: 'Sand', accessibility: 'Medium', region: 'South Coast' },
        'Okanda': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
        'Pottuvil Point': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
        'Whiskey Point': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
        'Lazy Left': { bottomType: 'Reef', accessibility: 'Medium', region: 'East Coast' },
        'Lazy Right': { bottomType: 'Reef', accessibility: 'Medium', region: 'East Coast' }
    };
}

// --- MODEL 2: SUITABILITY CALCULATION (UNCHANGED) ---
const calculateSuitability = (predictions, preferences, spotRegion) => {
    // Validate inputs
    if (!predictions || !preferences) {
        console.warn('Missing predictions or preferences for suitability calculation');
        return 0;
    }

    const { skillLevel = 'Beginner', boardType = 'Soft-top', tidePreference = 'Any' } = preferences;
    const minWaveHeight = parseFloat(preferences.minWaveHeight) || 0.5;
    const maxWaveHeight = parseFloat(preferences.maxWaveHeight) || 2.5;
    const { waveHeight = 1.0, wavePeriod = 10, windSpeed = 15, windDirection = 0, tide = {} } = predictions;

    let score = 100;

    // Rules for scoring (as we defined before)
    if (skillLevel === 'Beginner' && waveHeight > 1.2) score -= 50;
    if (skillLevel === 'Intermediate' && (waveHeight < 0.8 || waveHeight > 2.5)) score -= 30;
    if (skillLevel === 'Advanced' && waveHeight < 1.5) score -= 40;
    if (waveHeight < minWaveHeight || waveHeight > maxWaveHeight) score -= 25;
    if (boardType === 'Shortboard' && wavePeriod < 9) score -= 20;
    if (boardType !== 'Shortboard' && wavePeriod > 12) score -= 15;
    if (windSpeed > 25) score -= 50;
    else if (windSpeed > 15) score -= 25;
    
    const isOffshoreForEastCoast = (spotRegion === 'East Coast' && windDirection > 240 && windDirection < 300);
    const isOffshoreForSouthCoast = (spotRegion === 'South Coast' && (windDirection > 330 || windDirection < 30));
    if (!isOffshoreForEastCoast && !isOffshoreForSouthCoast) {
        score -= 30;
    }

    if (tidePreference !== 'Any' && tide.status !== tidePreference) score -= 15;

    const currentMonth = new Date().getMonth() + 1;
    const isEastCoastSeason = currentMonth >= 4 && currentMonth <= 10;
    if (spotRegion === 'East Coast' && !isEastCoastSeason) score -= 60;
    if (spotRegion === 'South Coast' && isEastCoastSeason) score -= 60;

    return Math.max(0, Math.min(100, score));
};

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount session routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/api/spots', async (req, res) => {
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

    // --- SESSION-BASED LEARNING: Load user insights from past sessions ---
    const userId = req.query.userId;
    if (userId && isMongoConnected) {
        try {
            const Session = require('./models/Session');
            const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(50);
            
            if (sessions.length >= 5) {
                console.log(`Loading session insights for user ${userId} (${sessions.length} sessions)`);
                
                // Filter high-rated sessions (4-5 stars)
                const highRatedSessions = sessions.filter(s => s.rating >= 4);
                
                if (highRatedSessions.length > 0) {
                    // Learn preferred wave height from high-rated sessions
                    const waveHeights = highRatedSessions
                        .map(s => s.conditions?.waveHeight)
                        .filter(h => h != null && h > 0);
                    
                    if (waveHeights.length > 0) {
                        userPreferences.learnedWaveHeight = 
                            waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
                        console.log(`  Learned wave preference: ${userPreferences.learnedWaveHeight.toFixed(2)}m`);
                    }
                    
                    // Learn preferred wind speed from high-rated sessions
                    const windSpeeds = highRatedSessions
                        .map(s => s.conditions?.windSpeed)
                        .filter(w => w != null && w > 0);
                    
                    if (windSpeeds.length > 0) {
                        userPreferences.learnedWindSpeed = 
                            windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
                        console.log(`  Learned wind preference: ${userPreferences.learnedWindSpeed.toFixed(1)} km/h`);
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
                            // Sort by visit count first, then by rating
                            if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
                            return b.avgRating - a.avgRating;
                        })
                        .slice(0, 5)  // Top 5 favorite spots
                        .map(s => s.name);
                    
                    userPreferences.favoriteSpots = favoriteSpots;
                    console.log(`  Favorite spots: ${favoriteSpots.join(', ')}`);
                }
            }
        } catch (error) {
            console.error('Error loading session insights:', error.message);
            // Continue without session insights if error occurs
        }
    }

    // --- CACHE LOGIC ---
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp < cache.CACHE_DURATION_MS)) {
        console.log("Serving request from cache.");
        try {
            const spotsWithPredictions = cache.data;
            
            // Use Enhanced Suitability Calculator
            const enhancedSpots = spotsWithPredictions.map(spot => {
                // Merge spot metadata
                const spotWithMeta = {
                    ...spot,
                    ...SPOT_METADATA[spot.name]
                };
                
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
            
            // Sort by score
            enhancedSpots.sort((a, b) => b.score - a.score);
            
            return res.json({ spots: enhancedSpots });
        } catch (error) {
            console.error('Error processing cached data:', error);
            // Fall through to fetch new data
        }
    }
    
    console.log("Cache is stale or empty. Fetching new data from Python script.");
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [SPOT_RECOMMENDER_SCRIPT], {
        cwd: path.resolve(__dirname, '..', 'surfapp--ml-engine')
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
        
        if (hasResponded) return; // Already sent response due to timeout
        hasResponded = true;

        console.log(`Python process exited with code: ${code}`);
        console.log(`Python stdout length: ${pythonOutput.length}`);
        console.log(`Python stderr: ${pythonError}`);

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
            
            // --- Store the new data in the cache ---
            cache.data = spotsWithPredictions;
            cache.timestamp = Date.now();
            console.log(`Updated cache with ${spotsWithPredictions.length} spots.`);

            // Use Enhanced Suitability Calculator for new data
            const enhancedSpots = spotsWithPredictions.map(spot => {
                // Merge spot metadata
                const spotWithMeta = {
                    ...spot,
                    ...SPOT_METADATA[spot.name]
                };
                
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
            
            // Sanitize all numeric values to prevent NaN in JSON response
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
            
            const sanitizedSpots = enhancedSpots.map(sanitizeObject);
            
            // Sort by score
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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        cache: {
            hasData: !!cache.data,
            age: cache.timestamp ? Date.now() - cache.timestamp : null
        }
    });
});

// 7-Day Multi-Output Forecast Endpoint
app.get('/api/forecast-chart', async (req, res) => {
    try {
        const spotId = req.query.spotId || '2'; // Default to Weligama
        
        // Load surf spots to get coordinates
        const spotsPath = path.join(__dirname, '..', 'SurfApp--frontend', 'data', 'surf_spots.json');
        const spotsData = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));
        const spot = spotsData.find(s => s.id === spotId);
        
        if (!spot || !spot.coords || spot.coords.length !== 2) {
            return res.status(404).json({ error: 'Spot not found or invalid coordinates' });
        }

        const [lng, lat] = spot.coords;
        
        console.log(`Fetching 7-day forecast for ${spot.name} (${lat}, ${lng})...`);
        
        // Call Python 7-day forecast service
        const pythonProcess = spawn(PYTHON_EXECUTABLE, [FORECAST_7DAY_SCRIPT, lat.toString(), lng.toString()], {
            cwd: path.resolve(__dirname, '..', 'surfapp--ml-engine')
        });

        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdout.on('data', (data) => pythonOutput += data.toString());
        pythonProcess.stderr.on('data', (data) => {
            pythonError += data.toString();
            console.log(`[FORECAST LOG]: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('7-day forecast script failed:', pythonError);
                // Fallback to mock data
                return res.json({
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
                    wavePeriod: [10, 11, 10, 12, 11, 10, 10],
                    swellHeight: [1.0, 1.2, 1.1, 1.4, 1.3, 1.2, 1.1],
                    swellPeriod: [12, 13, 12, 14, 13, 12, 12],
                    windSpeed: [15, 14, 16, 13, 15, 14, 15],
                    windDirection: [180, 190, 185, 200, 195, 180, 185],
                    metadata: { dataSource: 'Mock', forecastMethod: 'Fallback' }
                });
            }

            try {
                const forecastData = JSON.parse(pythonOutput);
                
                // Format for frontend
                res.json({
                    labels: forecastData.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    waveHeight: forecastData.forecast.waveHeight,
                    wavePeriod: forecastData.forecast.wavePeriod,
                    swellHeight: forecastData.forecast.swellHeight,
                    swellPeriod: forecastData.forecast.swellPeriod,
                    windSpeed: forecastData.forecast.windSpeed,
                    windDirection: forecastData.forecast.windDirection,
                    metadata: forecastData.metadata || {}
                });
            } catch (error) {
                console.error('Error parsing forecast data:', error);
                // Fallback to mock data
                res.json({
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
                    wavePeriod: [10, 11, 10, 12, 11, 10, 10],
                    swellHeight: [1.0, 1.2, 1.1, 1.4, 1.3, 1.2, 1.1],
                    swellPeriod: [12, 13, 12, 14, 13, 12, 12],
                    windSpeed: [15, 14, 16, 13, 15, 14, 15],
                    windDirection: [180, 190, 185, 200, 195, 180, 185],
                    metadata: { dataSource: 'Mock', forecastMethod: 'Fallback' }
                });
            }
        });

    } catch (error) {
        console.error('Error in forecast endpoint:', error);
        // Fallback to mock data
        res.json({
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
            wavePeriod: [10, 11, 10, 12, 11, 10, 10],
            swellHeight: [1.0, 1.2, 1.1, 1.4, 1.3, 1.2, 1.1],
            swellPeriod: [12, 13, 12, 14, 13, 12, 12],
            windSpeed: [15, 14, 16, 13, 15, 14, 15],
            windDirection: [180, 190, 185, 200, 195, 180, 185],
            metadata: { dataSource: 'Mock', forecastMethod: 'Fallback' }
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Surf Ceylon Backend running on http://localhost:${PORT}`);
});