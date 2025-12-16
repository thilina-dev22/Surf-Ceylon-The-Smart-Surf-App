const moment = require('moment');

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

        // Historical crowd patterns
        this.crowdPatterns = {
            weekday: { morning: 0.3, afternoon: 0.5, evening: 0.2 },
            weekend: { morning: 0.7, afternoon: 0.9, evening: 0.4 }
        };

        // Popular spots that attract more crowds
        this.popularSpots = [
            'Weligama', 'Arugam Bay', 'Hikkaduwa', 'Midigama',
            'Lazy Left', 'Pottuvil Point'
        ];

        // Spot accessibility ratings
        this.spotAccessibility = {
            'Weligama': 'High',
            'Hikkaduwa': 'High',
            'Midigama': 'Medium',
            'Arugam Bay': 'Medium',
            'Hiriketiya': 'Medium',
            'Okanda': 'Low',
            'Pottuvil Point': 'Low',
            'Whiskey Point': 'Low'
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
        
        // Get adaptive weights based on skill level
        const skillLevel = userPreferences.skillLevel || 'Intermediate';
        const weights = this.getAdaptiveWeights(skillLevel);
        
        // Extract forecast values with defaults
        const waveHeight = forecast.waveHeight ?? 0;
        const wavePeriod = forecast.wavePeriod ?? 0;
        const windSpeed = forecast.windSpeed ?? 0;
        const windDirection = forecast.windDirection ?? 0;
        const tideStatus = forecast.tide?.status || 'Unknown';
        
        // Ensure currentTime is a moment object
        const time = currentTime ? (moment.isMoment(currentTime) ? currentTime : moment()) : moment();
        
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
            optimal: spot.optimalTide
        };
        
        // 5. Time of Day Score - Enhanced with golden hours and timing bonuses
        const hour = time.hour();
        const enhancedTimeScore = this.calculateEnhancedTimeScore(forecast, hour);
        const timeScore = enhancedTimeScore / 100; // Convert to 0-1 range
        breakdown.timeOfDay = {
            score: timeScore,
            current: hour,
            optimal: spot.bestTime || 'Morning'
        };
        
        // 6. Crowd Level Prediction
        const crowdData = this.predictCrowdLevel(spot, time);
        breakdown.crowd = crowdData.score;
        
        // 7. Safety Score - Comprehensive skill-based evaluation
        const safetyData = this.calculateSafetyScore(forecast, spot, skillLevel);
        breakdown.safety = safetyData.score;
        
        // 8. Consistency Score - Wave quality and predictability
        const consistencyScore = this.calculateConsistencyScore(forecast);
        breakdown.consistency = consistencyScore;
        
        // Calculate weighted score using adaptive weights
        const waveScore = (waveHeightScore * 0.67 + wavePeriodScore * 0.33) * 100;
        const windTotalScore = (windScore.speedScore * 0.6 + windScore.directionScore * 0.4) * 100;
        
        const weightedScore = 
            (waveScore * weights.wave) +
            (windTotalScore * weights.wind) +
            (enhancedTimeScore * weights.time) +
            (crowdData.score * weights.crowd) +
            (safetyData.score * weights.safety) +
            (consistencyScore * weights.consistency);
        
        // Normalize to 0-100 scale
        let normalizedScore = weightedScore;
        
        // Region preference bonus
        let regionBonus = 0;
        if (userPreferences.preferredRegion && spot.region === userPreferences.preferredRegion) {
            regionBonus = 5;
            normalizedScore += regionBonus;
        }
        
        // Session-based bonuses
        let sessionBonuses = [];
        
        // Favorite spot bonus (+15 points)
        if (userPreferences.favoriteSpots && Array.isArray(userPreferences.favoriteSpots)) {
            if (userPreferences.favoriteSpots.includes(spot.name)) {
                normalizedScore += 15;
                sessionBonuses.push({
                    type: 'favorite_spot',
                    points: 15,
                    message: '⭐ One of your favorite spots!'
                });
            }
        }
        
        // Learned wave preference match (+10 points)
        if (userPreferences.learnedWaveHeight && waveHeight) {
            const waveDiff = Math.abs(waveHeight - userPreferences.learnedWaveHeight);
            if (waveDiff <= 0.3) {
                normalizedScore += 10;
                sessionBonuses.push({
                    type: 'wave_match',
                    points: 10,
                    message: `🌊 Waves match your preferred ${userPreferences.learnedWaveHeight.toFixed(1)}m conditions!`
                });
            }
        }
        
        // Learned wind preference match (+5 points)
        if (userPreferences.learnedWindSpeed && windSpeed) {
            const windDiff = Math.abs(windSpeed - userPreferences.learnedWindSpeed);
            if (windDiff <= 5) {
                normalizedScore += 5;
                sessionBonuses.push({
                    type: 'wind_match',
                    points: 5,
                    message: `💨 Wind matches your preferred ${userPreferences.learnedWindSpeed.toFixed(0)} km/h conditions!`
                });
            }
        }
        
        // Safety override: Cap score if conditions are dangerous
        if (!safetyData.canSurf) {
            normalizedScore = Math.min(normalizedScore, 35);
        }
        
        // Cap final score at 100
        normalizedScore = Math.min(normalizedScore, 100);
        normalizedScore = Math.round(normalizedScore);
        
        // Generate smart contextual recommendations
        const smartRecommendations = this.generateSmartRecommendations(
            normalizedScore,
            breakdown,
            crowdData,
            safetyData,
            spot,
            time
        );
        recommendations.push(...smartRecommendations);
        
        // Add session-based recommendations to the top
        sessionBonuses.forEach(bonus => {
            recommendations.unshift(bonus.message);
        });
        
        // Determine suitability level
        let suitability;
        if (normalizedScore >= 80) suitability = 'Excellent';
        else if (normalizedScore >= 65) suitability = 'Good';
        else if (normalizedScore >= 50) suitability = 'Fair';
        else if (normalizedScore >= 35) suitability = 'Poor';
        else suitability = 'Unsuitable';
        
        // Can surf determination from safety data
        const canSurf = safetyData.canSurf;
        
        // Add aggregated scores for frontend radar chart
        breakdown.overall = normalizedScore;
        breakdown.wave = Math.round(waveScore);
        breakdown.wind = Math.round(windTotalScore);
        breakdown.time = Math.round(enhancedTimeScore);
        breakdown.sessionBonuses = sessionBonuses;
        
        // Add safety warnings to main warnings array
        if (safetyData.warnings && safetyData.warnings.length > 0) {
            warnings.push(...safetyData.warnings);
        }
        
        // Generate detailed warnings
        const detailedWarnings = this.generateDetailedWarnings(breakdown, safetyData, spot, forecast);
        
        // Merge warnings (avoid duplicates)
        const allWarnings = [...new Set([...warnings, ...detailedWarnings.map(w => w.message)])];
        
        return {
            score: normalizedScore,
            suitability,
            breakdown,
            recommendations,
            warnings: allWarnings,
            weights,
            canSurf,
            timestamp: time.toISOString()
        };
    }
    
    // HELPER METHODS
    
    getAdaptiveWeights(skillLevel) {
        const weightProfiles = {
            'Beginner': {
                safety: 0.30,
                wave: 0.25,
                crowd: 0.15,
                wind: 0.10,
                time: 0.10,
                consistency: 0.10
            },
            'Intermediate': {
                wave: 0.30,
                consistency: 0.20,
                safety: 0.20,
                wind: 0.15,
                time: 0.10,
                crowd: 0.05
            },
            'Advanced': {
                wave: 0.35,
                consistency: 0.20,
                wind: 0.20,
                time: 0.10,
                safety: 0.10,
                crowd: 0.05
            }
        };
        
        return weightProfiles[skillLevel] || weightProfiles['Intermediate'];
    }
    
    /**
     * Enhanced time-aware scoring with golden hours and timing bonuses
     */
    calculateEnhancedTimeScore(forecast, currentHour) {
        const { windSpeed, windDirection, tide } = forecast;
        
        let timeScore = 50;
        
        // Golden hours (6-9 AM)
        if (currentHour >= 6 && currentHour <= 9) {
            timeScore += 20;
        }
        
        // Dawn patrol (5-7 AM + light winds)
        if (currentHour >= 5 && currentHour <= 7 && windSpeed < 10) {
            timeScore += 15;
        }
        
        // Offshore wind window
        if (windDirection >= 270 && windDirection <= 360 && currentHour >= 6 && currentHour <= 18) {
            timeScore += 15;
        }
        
        // Midday penalty
        if (currentHour >= 11 && currentHour <= 14) {
            timeScore -= 10;
        }
        
        // Evening session bonus
        if (currentHour >= 16 && currentHour <= 18) {
            timeScore += 10;
        }
        
        // Tide timing bonuses
        if (tide && tide.status === 'Mid') {
            if (currentHour >= 7 && currentHour <= 11) {
                timeScore += 10;
            }
            if (currentHour >= 16 && currentHour <= 18) {
                timeScore += 8;
            }
        }
        
        // Low tide early morning warning
        if (tide && tide.status === 'Low' && currentHour >= 5 && currentHour <= 8) {
            timeScore -= 5;
        }
        
        return Math.max(0, Math.min(100, timeScore));
    }
    
    /**
     * Predict crowd level using multiple factors
     */
    predictCrowdLevel(spot, currentTime) {
        const dayOfWeek = currentTime.day();
        const hour = currentTime.hour();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const month = currentTime.month();
        
        let crowdFactor = isWeekend ? 0.7 : 0.3;
        
        // Peak tourist season
        const isHighSeason = (month >= 11 || month <= 2) || (month >= 6 && month <= 7);
        if (isHighSeason) {
            crowdFactor += 0.2;
        }
        
        // Popular spots
        if (this.popularSpots.includes(spot.name)) {
            crowdFactor += 0.2;
        }
        
        // Time-based adjustment
        if (hour >= 8 && hour <= 16) {
            crowdFactor += 0.3;
        } else if (hour >= 5 && hour <= 7) {
            crowdFactor -= 0.2;
        } else if (hour >= 17 && hour <= 19) {
            crowdFactor += 0.1;
        } else {
            crowdFactor -= 0.3;
        }
        
        // Accessibility factor
        const accessibility = this.spotAccessibility[spot.name] || 'Medium';
        const accessibilityScore = {
            'High': 0.3,
            'Medium': 0.1,
            'Low': -0.2
        };
        crowdFactor += accessibilityScore[accessibility];
        
        // Region-specific patterns
        if (spot.region === 'East Coast' && (month >= 4 && month <= 9)) {
            crowdFactor += 0.15;
        }
        if (spot.region === 'South Coast' && (month >= 10 || month <= 3)) {
            crowdFactor += 0.15;
        }
        
        crowdFactor = Math.max(0, Math.min(1, crowdFactor));
        
        let level, score, description;
        if (crowdFactor > 0.7) {
            level = 'High';
            score = 30;
            description = 'Very crowded - expect competition for waves';
        } else if (crowdFactor > 0.4) {
            level = 'Medium';
            score = 60;
            description = 'Moderate crowds - still plenty of waves';
        } else {
            level = 'Low';
            score = 100;
            description = 'Empty or few surfers - enjoy the session!';
        }
        
        return { level, score, factor: crowdFactor, description };
    }
    
    /**
     * Comprehensive safety score with skill-based evaluation
     */
    calculateSafetyScore(forecast, spot, userSkillLevel) {
        const { waveHeight, windSpeed, windDirection, tide } = forecast;
        
        let safetyScore = 100;
        const warnings = [];
        const tips = [];
        
        const safeWaveHeights = {
            'Beginner': { max: 1.5, ideal: 1.0 },
            'Intermediate': { max: 2.5, ideal: 1.8 },
            'Advanced': { max: 5.0, ideal: 2.5 }
        };
        
        const skillThresholds = safeWaveHeights[userSkillLevel] || safeWaveHeights['Intermediate'];
        
        // Wave height safety
        if (waveHeight > skillThresholds.max) {
            const excess = waveHeight - skillThresholds.max;
            const penalty = Math.min(40, excess * 20);
            safetyScore -= penalty;
            warnings.push(`⚠️ Waves too large for ${userSkillLevel} (${waveHeight.toFixed(1)}m)`);
        } else if (waveHeight > skillThresholds.ideal) {
            const excess = waveHeight - skillThresholds.ideal;
            safetyScore -= excess * 10;
            tips.push(`💡 Waves on upper end for ${userSkillLevel} - exercise caution`);
        }
        
        // Wind safety
        if (windSpeed > 35) {
            safetyScore -= 30;
            warnings.push(`🌬️ Strong winds (${windSpeed.toFixed(1)} km/h) - challenging conditions`);
        } else if (windSpeed > 25) {
            safetyScore -= 15;
            tips.push(`💨 Moderate winds - conditions may be choppy`);
        }
        
        // Beginner-specific warnings
        if (userSkillLevel === 'Beginner') {
            if (windSpeed > 20 && windDirection >= 270 && windDirection <= 360) {
                safetyScore -= 25;
                warnings.push(`⚠️ Strong offshore winds - stay close to shore`);
            }
            
            if (spot.bottomType === 'Reef' || spot.bottomType === 'Rock') {
                safetyScore -= 10;
                warnings.push(`🪨 Reef break - wear protection`);
            }
        }
        
        // Low tide + reef warnings
        if (tide && tide.status === 'Low') {
            if (spot.bottomType === 'Reef' || spot.bottomType === 'Rock') {
                if (waveHeight > 1.0) {
                    safetyScore -= 20;
                    warnings.push(`⚠️ Low tide on reef - shallow water hazard`);
                } else {
                    safetyScore -= 10;
                    tips.push(`🌊 Low tide - watch for exposed rocks`);
                }
            }
        }
        
        // Rip current warnings
        const ripCurrentSpots = ['Arugam Bay', 'Pottuvil Point', 'Whiskey Point'];
        if (ripCurrentSpots.includes(spot.name) && waveHeight > 1.5) {
            if (userSkillLevel === 'Beginner') {
                safetyScore -= 15;
                warnings.push(`⚠️ Strong currents expected - know rip current escape`);
            } else {
                tips.push(`🌊 Be aware of rip currents`);
            }
        }
        
        let level;
        if (safetyScore >= 80) level = 'Safe';
        else if (safetyScore >= 60) level = 'Moderate';
        else if (safetyScore >= 40) level = 'Caution';
        else level = 'Dangerous';
        
        return {
            score: Math.max(0, Math.round(safetyScore)),
            level,
            warnings,
            tips,
            canSurf: safetyScore >= 30
        };
    }
    
    /**
     * Calculate consistency score
     */
    calculateConsistencyScore(forecast) {
        const { wavePeriod, windSpeed, waveHeight } = forecast;
        
        let consistencyScore = 50;
        
        // Wave period consistency
        if (wavePeriod >= 14) consistencyScore += 35;
        else if (wavePeriod >= 12) consistencyScore += 25;
        else if (wavePeriod >= 10) consistencyScore += 15;
        else if (wavePeriod >= 8) consistencyScore += 5;
        else consistencyScore -= 20;
        
        // Wind stability
        if (windSpeed >= 8 && windSpeed <= 15) consistencyScore += 20;
        else if (windSpeed >= 5 && windSpeed <= 20) consistencyScore += 10;
        else if (windSpeed < 5) consistencyScore += 5;
        else if (windSpeed > 30) consistencyScore -= 30;
        else if (windSpeed > 20) consistencyScore -= 15;
        
        // Wave height sweet spot
        if (waveHeight >= 1.0 && waveHeight <= 2.5) consistencyScore += 10;
        else if (waveHeight < 0.5) consistencyScore -= 10;
        else if (waveHeight > 4.0) consistencyScore -= 10;
        
        return Math.max(0, Math.min(100, consistencyScore));
    }
    
    /**
     * Generate smart contextual recommendations
     */
    generateSmartRecommendations(score, breakdown, crowdData, safetyData, spot, currentTime) {
        const recommendations = [];
        const hour = currentTime.hour();
        
        // Overall assessment
        if (score >= 80) {
            recommendations.push('🌊 Excellent conditions! This is a great choice right now.');
        } else if (score >= 65) {
            recommendations.push('✅ Good conditions - should be a fun session!');
        } else if (score >= 50) {
            recommendations.push('👌 Fair conditions - manageable but not ideal.');
        } else {
            recommendations.push('⚠️ Challenging conditions - consider alternatives.');
        }
        
        // Safety warnings (highest priority)
        if (safetyData.warnings && safetyData.warnings.length > 0) {
            recommendations.push(safetyData.warnings[0]);
        }
        
        // Crowd-based recommendations
        if (crowdData.level === 'High') {
            if (hour < 7) {
                recommendations.push('🌅 Consider dawn patrol tomorrow to beat crowds');
            } else if (hour < 10) {
                recommendations.push('⏰ Crowds building - go now or wait until evening');
            } else {
                recommendations.push('👥 High crowd - nearby alternatives may be less busy');
            }
        } else if (crowdData.level === 'Low' && score >= 60) {
            recommendations.push('✨ Low crowd + good conditions = perfect session!');
        }
        
        // Time-based recommendations
        if (breakdown.time < 50 && hour >= 10 && hour <= 15) {
            recommendations.push('☀️ Midday session - bring sunscreen and hydrate');
        }
        
        if (hour >= 16 && hour <= 18 && breakdown.time >= 60) {
            recommendations.push('🌅 Prime evening session window!');
        }
        
        // Wave quality tips
        if (breakdown.consistency >= 70) {
            recommendations.push('📊 Consistent swell - expect clean, organized sets');
        } else if (breakdown.consistency < 40) {
            recommendations.push('🌊 Choppy conditions - waves may be inconsistent');
        }
        
        // Safety tips
        if (safetyData.tips && safetyData.tips.length > 0 && recommendations.length < 5) {
            recommendations.push(safetyData.tips[0]);
        }
        
        // Wind conditions
        if (breakdown.wind >= 80) {
            recommendations.push('💨 Offshore winds - excellent grooming conditions');
        }
        
        return recommendations.slice(0, 5);
    }
    
    /**
     * Generate detailed warnings with severity levels
     */
    generateDetailedWarnings(breakdown, safetyData, spot, forecast) {
        const warnings = [];
        
        if (forecast.windSpeed > 35) {
            warnings.push({
                severity: 'high',
                message: 'Strong winds - dangerous conditions',
                icon: '⚠️'
            });
        } else if (forecast.windSpeed > 25) {
            warnings.push({
                severity: 'medium',
                message: 'Strong winds expected',
                icon: '💨'
            });
        }
        
        if (forecast.waveHeight > 3.5) {
            warnings.push({
                severity: 'high',
                message: 'Large swell - experienced surfers only',
                icon: '🌊'
            });
        } else if (forecast.waveHeight > 2.5) {
            warnings.push({
                severity: 'medium',
                message: 'Large waves - caution advised',
                icon: '🌊'
            });
        }
        
        if (breakdown.safety < 40) {
            warnings.push({
                severity: 'medium',
                message: 'Poor safety conditions - use caution',
                icon: '⚠️'
            });
        }
        
        if (breakdown.overall < 30) {
            warnings.push({
                severity: 'low',
                message: 'Not recommended for surfing today',
                icon: '❌'
            });
        }
        
        return warnings;
    }
    
    // Original helper methods (kept from old version)
    
    calculateWaveHeightScore(waveHeight, skillLevel = 'Intermediate') {
        // Skill-based optimal wave height ranges
        const optimalRanges = {
            'Beginner': { min: 0.5, ideal: 1.0, max: 1.5 },
            'Intermediate': { min: 1.0, ideal: 1.5, max: 2.5 },
            'Advanced': { min: 1.5, ideal: 2.5, max: 5.0 }
        };
        
        const range = optimalRanges[skillLevel] || optimalRanges['Intermediate'];
        
        if (waveHeight < range.min) {
            return Math.max(0, waveHeight / range.min);
        } else if (waveHeight <= range.ideal) {
            return 1.0;
        } else if (waveHeight <= range.max) {
            return 1.0 - ((waveHeight - range.ideal) / (range.max - range.ideal)) * 0.3;
        } else {
            return Math.max(0, 0.7 - ((waveHeight - range.max) / range.max) * 0.5);
        }
    }
    
    calculateWavePeriodScore(wavePeriod) {
        // Optimal: 12-16s (groundswell)
        // Good: 8-12s (clean swell)
        // Poor: <8s (wind swell)
        if (wavePeriod >= 12 && wavePeriod <= 16) return 1.0;
        if (wavePeriod >= 8 && wavePeriod < 12) return 0.7 + (wavePeriod - 8) / 4 * 0.3;
        if (wavePeriod > 16) return Math.max(0.7, 1.0 - (wavePeriod - 16) / 10);
        return Math.max(0.3, wavePeriod / 8 * 0.7);
    }
    
    calculateWindScore(windSpeed, windDirection, optimalDirection = null) {
        // Speed scoring (km/h)
        let speedScore;
        if (windSpeed < 5) speedScore = 0.6; // Too light
        else if (windSpeed <= 15) speedScore = 1.0; // Optimal
        else if (windSpeed <= 25) speedScore = 0.7; // Moderate
        else if (windSpeed <= 35) speedScore = 0.4; // Strong
        else speedScore = 0.1; // Very strong
        
        // Direction scoring
        let directionScore = 0.7; // Default neutral
        if (optimalDirection) {
            const diff = Math.abs(windDirection - optimalDirection);
            const normalizedDiff = Math.min(diff, 360 - diff);
            if (normalizedDiff <= 45) directionScore = 1.0;
            else if (normalizedDiff <= 90) directionScore = 0.8;
            else if (normalizedDiff <= 135) directionScore = 0.6;
            else directionScore = 0.4;
        }
        
        return { speedScore, directionScore };
    }
    
    calculateTideScore(tideStatus, optimalTide) {
        if (!optimalTide || optimalTide === 'Any') return 0.8;
        
        const tideMatch = {
            'Low': { 'Low': 1.0, 'Mid': 0.7, 'High': 0.4 },
            'Mid': { 'Low': 0.7, 'Mid': 1.0, 'High': 0.7 },
            'High': { 'Low': 0.4, 'Mid': 0.7, 'High': 1.0 }
        };
        
        return tideMatch[tideStatus]?.[optimalTide] || 0.7;
    }
    
    calculateTimeScore(currentHour, optimalTime) {
        // Morning (6-10): 1.0
        // Midday (10-14): 0.6
        // Afternoon (14-18): 0.8
        // Other: 0.5
        if (currentHour >= 6 && currentHour < 10) return 1.0;
        if (currentHour >= 10 && currentHour < 14) return 0.6;
        if (currentHour >= 14 && currentHour < 18) return 0.8;
        return 0.5;
    }
}

module.exports = EnhancedSuitabilityCalculator;
