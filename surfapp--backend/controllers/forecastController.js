const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PYTHON_EXECUTABLE, FORECAST_7DAY_SCRIPT } = require('../config/python');
const { generateDateLabels } = require('../config/utils');

const getForecastChart = async (req, res) => {
    try {
        const spotId = req.query.spotId || '2'; // Default to Weligama
        
        // Load surf spots to get coordinates
        const spotsPath = path.join(__dirname, '..', '..', 'SurfApp--frontend', 'data', 'surf_spots.json');
        const spotsData = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));
        const spot = spotsData.find(s => s.id === spotId);
        
        if (!spot || !spot.coords || spot.coords.length !== 2) {
            return res.status(404).json({ error: 'Spot not found or invalid coordinates' });
        }

        const [lng, lat] = spot.coords;
        
        console.log(`Fetching 7-day forecast for ${spot.name} (${lat}, ${lng})...`);
        
        // Call Python 7-day forecast service
        const pythonProcess = spawn(PYTHON_EXECUTABLE, [FORECAST_7DAY_SCRIPT, lat.toString(), lng.toString()], {
            cwd: path.resolve(__dirname, '..', '..', 'surfapp--ml-engine')
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
                    labels: generateDateLabels(),
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
                const viewMode = req.query.viewMode || 'daily';
                
                // Check if new format with 'daily' and 'hourly' keys
                if (forecastData.daily && forecastData.hourly) {
                    // New format - return based on view mode
                    if (viewMode === 'hourly') {
                        // Organize hourly data by day for easier rendering
                        const hourlyByDay = {};
                        forecastData.hourly.forEach(hour => {
                            const day = hour.day;
                            if (!hourlyByDay[day]) {
                                hourlyByDay[day] = [];
                            }
                            hourlyByDay[day].push(hour);
                        });
                        
                        res.json({
                            labels: forecastData.labels || generateDateLabels(),
                            viewMode: 'hourly',
                            hourly: forecastData.hourly,
                            hourlyByDay,
                            metadata: forecastData.metadata || {}
                        });
                    } else {
                        // Daily view
                        res.json({
                            labels: forecastData.labels || generateDateLabels(),
                            viewMode: 'daily',
                            waveHeight: forecastData.daily.waveHeight,
                            wavePeriod: forecastData.daily.wavePeriod,
                            swellHeight: forecastData.daily.swellHeight,
                            swellPeriod: forecastData.daily.swellPeriod,
                            windSpeed: forecastData.daily.windSpeed,
                            windDirection: forecastData.daily.windDirection,
                            metadata: forecastData.metadata || {}
                        });
                    }
                } else {
                    // Old format - backward compatibility
                    res.json({
                        labels: forecastData.labels || generateDateLabels(),
                        waveHeight: forecastData.forecast?.waveHeight || forecastData.waveHeight,
                        wavePeriod: forecastData.forecast?.wavePeriod || forecastData.wavePeriod,
                        swellHeight: forecastData.forecast?.swellHeight || forecastData.swellHeight,
                        swellPeriod: forecastData.forecast?.swellPeriod || forecastData.swellPeriod,
                        windSpeed: forecastData.forecast?.windSpeed || forecastData.windSpeed,
                        windDirection: forecastData.forecast?.windDirection || forecastData.windDirection,
                        metadata: forecastData.metadata || {}
                    });
                }
            } catch (error) {
                console.error('Error parsing forecast data:', error);
                // Fallback to mock data
                res.json({
                    labels: generateDateLabels(),
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
            labels: generateDateLabels(),
            waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
            wavePeriod: [10, 11, 10, 12, 11, 10, 10],
            swellHeight: [1.0, 1.2, 1.1, 1.4, 1.3, 1.2, 1.1],
            swellPeriod: [12, 13, 12, 14, 13, 12, 12],
            windSpeed: [15, 14, 16, 13, 15, 14, 15],
            windDirection: [180, 190, 185, 200, 195, 180, 185],
            metadata: { dataSource: 'Mock', forecastMethod: 'Fallback' }
        });
    }
};

module.exports = {
    getForecastChart
};
