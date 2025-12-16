/**
 * Enhanced Suitability Calculator
 * Calculates surf spot suitability scores based on conditions, user preferences, and session insights
 */
class EnhancedSuitabilityCalculator {
    constructor() {
        // Default weights for suitability calculation
        this.defaultWeights = {
            waveHeight: 0.30,
            wavePeriod: 0.15,
            windSpeed: 0.25,
            windDirection: 0.15,
            tide: 0.10,
            timeOfDay: 0.05
        };
    }

    /**
     * Calculate enhanced suitability score for a surf spot
     * @param {Object} spot - Spot with metadata
     * @param {Object} forecast - Current forecast conditions
     * @param {Object} userPreferences - User's preferences
     * @param {Object} currentTime - Moment.js time object
     * @returns {Object} Suitability result with score, breakdown, recommendations
     */
    calculateEnhancedSuitability(spot, forecast, userPreferences = {}, currentTime) {
        // Validate forecast exists
        if (!forecast || typeof forecast !== 'object') {
            console.warn(`No forecast data for spot: ${spot.name || 'unknown'}`);
            // Return default poor conditions
            return {
                score: 0,
                suitability: 'Unknown',
                breakdown: {},
                recommendations: ['No forecast data available'],
                warnings: ['Unable to calculate suitability - missing forecast data'],
                weights: this.defaultWeights,
                canSurf: false
            };
        }
        
        const breakdown = {};
        const warnings = [];
        const recommendations = [];
        
        // Use user preferences or defaults
        const weights = { ...this.defaultWeights, ...userPreferences.weights };
        
        // Extract forecast values with defaults
        const waveHeight = forecast.waveHeight ?? 0;
        const wavePeriod = forecast.wavePeriod ?? 0;
        const windSpeed = forecast.windSpeed ?? 0;
        const windDirection = forecast.windDirection ?? 0;
        const tideStatus = forecast.tide?.status || 'Unknown';
        
        // 1. Wave Height Score
        const waveHeightScore = this.calculateWaveHeightScore(
            waveHeight,
            spot.optimalWaveHeight,
            userPreferences.learnedWaveHeight
        );
        breakdown.waveHeight = {
            score: waveHeightScore,
            current: waveHeight,
            optimal: spot.optimalWaveHeight,
            unit: 'm'
        };
        
        if (waveHeight < 0.5) {
            warnings.push('Very small waves - may be flat');
        } else if (waveHeight > 3.0) {
            warnings.push('Large waves - advanced surfers only');
        }
        
        // 2. Wave Period Score
        const wavePeriodScore = this.calculateWavePeriodScore(
            wavePeriod,
            10 // optimal period
        );
        breakdown.wavePeriod = {
            score: wavePeriodScore,
            current: wavePeriod,
            optimal: 10,
            unit: 's'
        };
        
        // 3. Wind Score
        const windScore = this.calculateWindScore(
            windSpeed,
            windDirection,
            spot.offshoreWind || 270,
            userPreferences.learnedWindSpeed
        );
        breakdown.windSpeed = {
            score: windScore.speedScore,
            current: windSpeed,
            optimal: '5-15',
            unit: 'km/h'
        };
        breakdown.windDirection = {
            score: windScore.directionScore,
            current: windDirection,
            optimal: spot.offshoreWind || 270,
            unit: '°'
        };
        
        if (windSpeed > 25) {
            warnings.push('Strong winds - choppy conditions');
        }
        
        // 4. Tide Score
        const tideScore = this.calculateTideScore(
            tideStatus,
            spot.optimalTide
        );
        breakdown.tide = {
            score: tideScore,
            current: tideStatus,
            optimal: spot.optimalTide || 'Mid'
        };
        
        // 5. Time of Day Score (if current time provided)
        let timeScore = 0.5; // neutral
        if (currentTime) {
            const hour = currentTime.hour();
            timeScore = this.calculateTimeScore(hour, spot.bestTime);
            breakdown.timeOfDay = {
                score: timeScore,
                current: hour,
                optimal: spot.bestTime || 'Morning'
            };
        }
        
        // Calculate weighted total score
        const totalScore = (
            waveHeightScore * weights.waveHeight +
            wavePeriodScore * weights.wavePeriod +
            windScore.speedScore * weights.windSpeed +
            windScore.directionScore * weights.windDirection +
            tideScore * weights.tide +
            timeScore * weights.timeOfDay
        );
        
        // Normalize to 0-100
        const normalizedScore = Math.round(totalScore * 100);
        
        // Generate recommendations
        if (normalizedScore >= 80) {
            recommendations.push('Excellent conditions - highly recommended!');
        } else if (normalizedScore >= 60) {
            recommendations.push('Good conditions for surfing');
        } else if (normalizedScore >= 40) {
            recommendations.push('Fair conditions - suitable for practice');
        } else {
            recommendations.push('Below average conditions');
        }
        
        // Suitability text
        let suitability;
        if (normalizedScore >= 80) suitability = 'Excellent';
        else if (normalizedScore >= 60) suitability = 'Good';
        else if (normalizedScore >= 40) suitability = 'Fair';
        else suitability = 'Poor';
        
        // Can surf determination
        const canSurf = normalizedScore >= 30 && waveHeight >= 0.3;
        
        // Add aggregated scores for frontend radar chart
        // Frontend expects: overall, wave, wind, time, crowd, safety, consistency
        breakdown.overall = normalizedScore;
        breakdown.wave = Math.round((waveHeightScore * 0.67 + wavePeriodScore * 0.33) * 100); // Wave quality aggregate
        breakdown.wind = Math.round((windScore.speedScore * 0.6 + windScore.directionScore * 0.4) * 100); // Wind aggregate
        breakdown.time = Math.round(timeScore * 100); // Time score
        breakdown.crowd = 50; // Default medium crowd (not implemented yet)
        breakdown.safety = normalizedScore >= 60 ? 75 : normalizedScore >= 40 ? 50 : 25; // Based on overall suitability
        breakdown.consistency = Math.round(wavePeriodScore * 100); // Wave period stability
        
        return {
            score: normalizedScore,
            suitability,
            breakdown,
            recommendations,
            warnings,
            weights,
            canSurf
        };
    }
    
    /**
     * Calculate wave height score (0-1)
     */
    calculateWaveHeightScore(current, optimal = 1.5, learned = null) {
        const target = learned || optimal || 1.5;
        const diff = Math.abs(current - target);
        
        // Perfect match = 1.0, decreases with distance
        if (diff === 0) return 1.0;
        if (diff <= 0.3) return 0.9;
        if (diff <= 0.5) return 0.8;
        if (diff <= 0.8) return 0.6;
        if (diff <= 1.2) return 0.4;
        return 0.2;
    }
    
    /**
     * Calculate wave period score (0-1)
     */
    calculateWavePeriodScore(current, optimal = 10) {
        if (current >= 12) return 1.0; // Long period swells
        if (current >= 10) return 0.9;
        if (current >= 8) return 0.7;
        if (current >= 6) return 0.5;
        return 0.3;
    }
    
    /**
     * Calculate wind score (0-1)
     */
    calculateWindScore(speed, direction, optimalDirection = 270, learnedSpeed = null) {
        // Speed score
        let speedScore;
        const targetSpeed = learnedSpeed || 10; // ideal ~10 km/h
        
        if (speed <= 5) speedScore = 0.7; // Too light
        else if (speed <= 15) speedScore = 1.0; // Perfect
        else if (speed <= 20) speedScore = 0.8; // Acceptable
        else if (speed <= 25) speedScore = 0.5; // Getting strong
        else speedScore = 0.3; // Too strong
        
        // Direction score (offshore is best)
        const directionDiff = Math.abs(direction - optimalDirection);
        const normalizedDiff = Math.min(directionDiff, 360 - directionDiff);
        
        let directionScore;
        if (normalizedDiff <= 15) directionScore = 1.0; // Perfect offshore
        else if (normalizedDiff <= 30) directionScore = 0.8;
        else if (normalizedDiff <= 45) directionScore = 0.6;
        else if (normalizedDiff <= 90) directionScore = 0.4;
        else directionScore = 0.2; // Onshore
        
        return { speedScore, directionScore };
    }
    
    /**
     * Calculate tide score (0-1)
     */
    calculateTideScore(current, optimal = 'Mid') {
        if (!current) return 0.5;
        
        const tideMap = {
            'Low': { 'Low': 1.0, 'Mid': 0.7, 'High': 0.4 },
            'Mid': { 'Low': 0.7, 'Mid': 1.0, 'High': 0.7 },
            'High': { 'Low': 0.4, 'Mid': 0.7, 'High': 1.0 }
        };
        
        return tideMap[optimal]?.[current] || 0.5;
    }
    
    /**
     * Calculate time of day score (0-1)
     */
    calculateTimeScore(hour, optimalTime = 'Morning') {
        const timePreferences = {
            'Morning': { range: [6, 10], score: 1.0 },
            'Midday': { range: [10, 14], score: 0.8 },
            'Afternoon': { range: [14, 18], score: 0.9 },
            'Evening': { range: [18, 20], score: 0.6 }
        };
        
        const pref = timePreferences[optimalTime] || timePreferences['Morning'];
        
        if (hour >= pref.range[0] && hour < pref.range[1]) {
            return pref.score;
        }
        
        return 0.5; // Neutral for other times
    }
}

module.exports = EnhancedSuitabilityCalculator;
