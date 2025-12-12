const moment = require('moment');

/**
 * Enhanced Suitability Calculator - Phase 1
 * Innovative multi-factor scoring system for surf spot recommendations
 */
class EnhancedSuitabilityCalculator {
  constructor() {
    // Historical crowd patterns (will be updated with real data in Phase 2)
    this.crowdPatterns = {
      weekday: { morning: 0.3, afternoon: 0.5, evening: 0.2 },
      weekend: { morning: 0.7, afternoon: 0.9, evening: 0.4 }
    };

    // Popular spots that attract more crowds
    this.popularSpots = [
      'Weligama', 'Arugam Bay', 'Hikkaduwa', 'Midigama',
      'Lazy Left', 'Pottuvil Point'
    ];

    // Spot accessibility ratings (easier to reach = more crowded)
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
   * INNOVATION 1: Time-Aware Scoring
   * Adjusts scores based on optimal surfing windows and conditions
   */
  calculateTimeScore(predictions, currentHour = moment().hour()) {
    const { windSpeed, windDirection, tide } = predictions;
    
    let timeScore = 50; // Base score
    
    // Golden hours: 6-9 AM (offshore winds, less crowded, glassy conditions)
    const isGoldenHour = currentHour >= 6 && currentHour <= 9;
    if (isGoldenHour) {
      timeScore += 20;
    }
    
    // Dawn patrol bonus (5-7 AM - typically lighter winds, empty lineup)
    const isDawnPatrol = currentHour >= 5 && currentHour <= 7;
    if (isDawnPatrol && windSpeed < 10) {
      timeScore += 15;
    }
    
    // Offshore wind window (270-360° for south coast Sri Lanka)
    const isOffshore = windDirection >= 270 && windDirection <= 360;
    if (isOffshore && currentHour >= 6 && currentHour <= 18) {
      timeScore += 15;
    }
    
    // Avoid midday heat (11 AM - 2 PM gets penalty)
    if (currentHour >= 11 && currentHour <= 14) {
      timeScore -= 10;
    }
    
    // Evening session bonus (4-6 PM - second best window)
    if (currentHour >= 16 && currentHour <= 18) {
      timeScore += 10;
    }
    
    // Tide timing bonus
    if (tide && tide.status === 'Mid') {
      // Mid tide in morning (7-11 AM) is often ideal
      if (currentHour >= 7 && currentHour <= 11) {
        timeScore += 10;
      }
      // Mid tide in evening (4-6 PM) also good
      if (currentHour >= 16 && currentHour <= 18) {
        timeScore += 8;
      }
    }
    
    // Low tide early morning can be dangerous on reef breaks
    if (tide && tide.status === 'Low' && currentHour >= 5 && currentHour <= 8) {
      timeScore -= 5;
    }
    
    return Math.max(0, Math.min(100, timeScore));
  }

  /**
   * INNOVATION 2: Crowd Prediction Model
   * Predicts crowd levels using multiple factors
   */
  predictCrowdLevel(spot, currentTime = moment()) {
    const dayOfWeek = currentTime.day(); // 0=Sunday, 6=Saturday
    const hour = currentTime.hour();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const month = currentTime.month(); // 0=Jan, 11=Dec
    
    // Base crowd factor from day of week
    let crowdFactor = isWeekend ? 0.7 : 0.3;
    
    // Peak tourist season (December-March, July-August)
    const isHighSeason = (month >= 11 || month <= 2) || (month >= 6 && month <= 7);
    if (isHighSeason) {
      crowdFactor += 0.2;
    }
    
    // Popular spots attract more crowds
    if (this.popularSpots.includes(spot.name)) {
      crowdFactor += 0.2;
    }
    
    // Time-based adjustment
    if (hour >= 8 && hour <= 16) {
      crowdFactor += 0.3; // Peak surfing hours
    } else if (hour >= 5 && hour <= 7) {
      crowdFactor -= 0.2; // Dawn patrol - dedicated surfers only
    } else if (hour >= 17 && hour <= 19) {
      crowdFactor += 0.1; // Evening session - moderate crowds
    } else {
      crowdFactor -= 0.3; // Early morning or late evening - empty
    }
    
    // Accessibility factor
    const accessibility = this.spotAccessibility[spot.name] || 'Medium';
    const accessibilityScore = {
      'High': 0.3,   // Easy to reach (main roads, parking)
      'Medium': 0.1, // Moderate effort (short walk, limited parking)
      'Low': -0.2    // Remote (long walk, 4WD needed, hidden)
    };
    crowdFactor += accessibilityScore[accessibility];
    
    // Region-specific patterns
    if (spot.region === 'East Coast' && (month >= 4 && month <= 9)) {
      // East coast season - more crowds
      crowdFactor += 0.15;
    }
    if (spot.region === 'South Coast' && (month >= 10 || month <= 3)) {
      // South coast season - more crowds
      crowdFactor += 0.15;
    }
    
    // Normalize to 0-1 range
    crowdFactor = Math.max(0, Math.min(1, crowdFactor));
    
    // Convert to crowd level and score
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
    
    return {
      level,
      score,
      factor: crowdFactor,
      description
    };
  }

  /**
   * INNOVATION 3: Safety Score
   * Calculates safety based on conditions, skill level, and spot characteristics
   */
  calculateSafetyScore(predictions, spot, userSkillLevel) {
    const { waveHeight, windSpeed, tide } = predictions;
    
    let safetyScore = 100;
    const warnings = [];
    const tips = [];
    
    // Safe wave height thresholds by skill level
    const safeWaveHeights = {
      'Beginner': { max: 1.5, ideal: 1.0 },
      'Intermediate': { max: 2.5, ideal: 1.8 },
      'Advanced': { max: 5.0, ideal: 2.5 }
    };
    
    const skillThresholds = safeWaveHeights[userSkillLevel] || safeWaveHeights['Intermediate'];
    
    // Wave height safety check
    if (waveHeight > skillThresholds.max) {
      const excess = waveHeight - skillThresholds.max;
      const penalty = Math.min(40, excess * 20);
      safetyScore -= penalty;
      warnings.push(`⚠️ Waves too large for ${userSkillLevel} (${waveHeight.toFixed(1)}m)`);
    } else if (waveHeight > skillThresholds.ideal) {
      const excess = waveHeight - skillThresholds.ideal;
      safetyScore -= excess * 10;
      tips.push(`💡 Waves are on the upper end for ${userSkillLevel} - exercise caution`);
    }
    
    // Strong wind warning
    if (windSpeed > 35) {
      safetyScore -= 30;
      warnings.push(`🌬️ Strong winds (${windSpeed.toFixed(1)} km/h) - challenging conditions`);
    } else if (windSpeed > 25) {
      safetyScore -= 15;
      tips.push(`💨 Moderate winds - conditions may be choppy`);
    }
    
    // Beginner-specific warnings
    if (userSkillLevel === 'Beginner') {
      // Offshore wind warning (can push you out to sea)
      if (windSpeed > 20 && predictions.windDirection >= 270 && predictions.windDirection <= 360) {
        safetyScore -= 25;
        warnings.push(`⚠️ Strong offshore winds - stay close to shore or use a leash`);
      }
      
      // Reef break warning
      if (spot.bottomType === 'Reef' || spot.bottomType === 'Rock') {
        safetyScore -= 10;
        warnings.push(`🪨 Reef break - consider wearing a wetsuit or reef boots`);
      }
    }
    
    // Low tide + reef/rock = dangerous
    if (tide && tide.status === 'Low') {
      if (spot.bottomType === 'Reef' || spot.bottomType === 'Rock') {
        if (waveHeight > 1.0) {
          safetyScore -= 20;
          warnings.push(`⚠️ Low tide on reef - shallow water, high risk of injury`);
        } else {
          safetyScore -= 10;
          tips.push(`🌊 Low tide - be mindful of depth, rocks may be exposed`);
        }
      }
    }
    
    // High tide warnings for certain spots
    if (tide && tide.status === 'High') {
      if (spot.name === 'Weligama' || spot.name === 'Hiriketiya') {
        tips.push(`🌊 High tide - watch for shore break and rip currents`);
      }
    }
    
    // Intermediate/Advanced specific conditions
    if (userSkillLevel === 'Advanced' && waveHeight < 1.0) {
      tips.push(`📉 Small waves - might be underwhelming for advanced surfers`);
    }
    
    // Current/rip warnings for specific spots
    const ripCurrentSpots = ['Arugam Bay', 'Pottuvil Point', 'Whiskey Point'];
    if (ripCurrentSpots.includes(spot.name) && waveHeight > 1.5) {
      if (userSkillLevel === 'Beginner') {
        safetyScore -= 15;
        warnings.push(`⚠️ Strong currents expected - know how to escape rip currents`);
      } else {
        tips.push(`🌊 Be aware of rip currents - use them to get out, swim parallel to escape`);
      }
    }
    
    // Determine safety level
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
      canSurf: safetyScore >= 30 // Minimum safety threshold
    };
  }

  /**
   * INNOVATION 4: Condition Consistency Score
   * Evaluates how stable and predictable the conditions are
   */
  calculateConsistencyScore(predictions) {
    const { wavePeriod, windSpeed, waveHeight } = predictions;
    
    let consistencyScore = 50;
    
    // Long period swells are more consistent and organized
    if (wavePeriod >= 14) {
      consistencyScore += 35; // Excellent groundswell
    } else if (wavePeriod >= 12) {
      consistencyScore += 25; // Good swell
    } else if (wavePeriod >= 10) {
      consistencyScore += 15; // Moderate swell
    } else if (wavePeriod >= 8) {
      consistencyScore += 5; // Short period, somewhat choppy
    } else {
      consistencyScore -= 20; // Very short period, choppy and inconsistent
    }
    
    // Moderate winds are more stable (not too light, not too strong)
    if (windSpeed >= 8 && windSpeed <= 15) {
      consistencyScore += 20; // Ideal range
    } else if (windSpeed >= 5 && windSpeed <= 20) {
      consistencyScore += 10; // Good range
    } else if (windSpeed < 5) {
      consistencyScore += 5; // Very light, but glassy
    } else if (windSpeed > 30) {
      consistencyScore -= 30; // Gusty, rapidly changing
    } else if (windSpeed > 20) {
      consistencyScore -= 15; // Getting windy
    }
    
    // Wave height consistency (mid-range is most consistent)
    if (waveHeight >= 1.0 && waveHeight <= 2.5) {
      consistencyScore += 10; // Sweet spot
    } else if (waveHeight < 0.5) {
      consistencyScore -= 10; // Too small, inconsistent
    } else if (waveHeight > 4.0) {
      consistencyScore -= 10; // Very large, sets may vary
    }
    
    return Math.max(0, Math.min(100, consistencyScore));
  }

  /**
   * INNOVATION 5: Adaptive Weighted Scoring
   * Dynamically adjusts factor weights based on user skill level
   */
  getAdaptiveWeights(userSkillLevel, userProfile = {}) {
    // Base weights for different skill levels
    const baseWeightProfiles = {
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
    
    // Get base weights
    const baseWeights = baseWeightProfiles[userSkillLevel] || baseWeightProfiles['Intermediate'];
    
    // Personalize based on user preferences
    const personalizedWeights = { ...baseWeights };
    
    // Adjust wave weight based on preferred wave height
    if (userProfile.preferredWaveHeight) {
      if (userProfile.preferredWaveHeight > 2.0) {
        // User likes bigger waves - increase wave importance
        personalizedWeights.wave = Math.min(0.40, personalizedWeights.wave + 0.05);
        personalizedWeights.safety = Math.max(0.05, personalizedWeights.safety - 0.03);
      } else if (userProfile.preferredWaveHeight < 1.0) {
        // User prefers smaller waves - increase safety importance
        personalizedWeights.safety = Math.min(0.35, personalizedWeights.safety + 0.05);
        personalizedWeights.wave = Math.max(0.20, personalizedWeights.wave - 0.03);
      }
    }
    
    // Adjust wind weight based on preferred wind speed
    if (userProfile.preferredWindSpeed) {
      if (userProfile.preferredWindSpeed < 10) {
        // User is sensitive to wind - increase wind importance
        personalizedWeights.wind = Math.min(0.25, personalizedWeights.wind + 0.05);
        personalizedWeights.time = Math.max(0.05, personalizedWeights.time - 0.03);
      }
    }
    
    // Adjust based on board type
    if (userProfile.boardType === 'Shortboard') {
      // Shortboarders care more about wave consistency and quality
      personalizedWeights.consistency = Math.min(0.25, personalizedWeights.consistency + 0.03);
      personalizedWeights.wave = Math.min(0.40, personalizedWeights.wave + 0.02);
      personalizedWeights.crowd = Math.max(0.03, personalizedWeights.crowd - 0.03);
    } else if (userProfile.boardType === 'Longboard') {
      // Longboarders more flexible with conditions
      personalizedWeights.consistency = Math.max(0.10, personalizedWeights.consistency - 0.02);
      personalizedWeights.time = Math.min(0.15, personalizedWeights.time + 0.02);
    }
    
    // Adjust based on regional preference
    if (userProfile.preferredRegion) {
      // User has regional preference - increase consistency importance
      personalizedWeights.consistency = Math.min(0.25, personalizedWeights.consistency + 0.02);
      personalizedWeights.crowd = Math.max(0.03, personalizedWeights.crowd - 0.02);
    }
    
    // Normalize weights to ensure they sum to 1.0
    const sum = Object.values(personalizedWeights).reduce((a, b) => a + b, 0);
    Object.keys(personalizedWeights).forEach(key => {
      personalizedWeights[key] = personalizedWeights[key] / sum;
    });
    
    return personalizedWeights;
  }

  /**
   * INNOVATION 6: Smart Recommendations
   * Generates context-aware recommendations based on all factors
   */
  generateRecommendations(score, breakdown, crowdData, safetyData, spot, currentTime = moment()) {
    const recommendations = [];
    const hour = currentTime.hour();
    
    // Overall condition assessment
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
        recommendations.push('🌅 Consider dawn patrol tomorrow to beat the crowds');
      } else if (hour < 10) {
        recommendations.push('⏰ Crowds building - go now or wait until evening');
      } else {
        recommendations.push('👥 High crowd expected - nearby alternatives may be less busy');
      }
    } else if (crowdData.level === 'Low' && score >= 60) {
      recommendations.push('✨ Low crowd + good conditions = perfect session!');
    }
    
    // Time-based recommendations
    if (breakdown.time < 50 && hour >= 10 && hour <= 15) {
      recommendations.push('☀️ Midday session - bring sunscreen and hydrate well');
    }
    
    if (hour >= 16 && hour <= 18 && breakdown.time >= 60) {
      recommendations.push('🌅 Prime evening session window - conditions look good!');
    }
    
    // Wave quality tips
    if (breakdown.consistency >= 70) {
      recommendations.push('📊 Consistent swell - expect clean, organized sets');
    } else if (breakdown.consistency < 40) {
      recommendations.push('🌊 Choppy conditions - waves may be inconsistent');
    }
    
    // Safety tips (lower priority than warnings)
    if (safetyData.tips && safetyData.tips.length > 0 && recommendations.length < 5) {
      recommendations.push(safetyData.tips[0]);
    }
    
    // Wind condition tips
    if (breakdown.wind >= 80) {
      recommendations.push('💨 Offshore winds - excellent grooming conditions');
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Wave Quality Score
   * Evaluates how well the wave matches user preferences
   */
  calculateWaveScore(predictions, userProfile) {
    const { waveHeight } = predictions;
    const preferred = userProfile.preferredWaveHeight || 1.5;
    
    // Calculate difference from preferred
    const difference = Math.abs(waveHeight - preferred);
    
    // Score decreases with distance from preference
    let score = 100 - (difference * 25);
    
    // Bonus for being within 20% of preferred
    if (difference < preferred * 0.2) {
      score += 10;
    }
    
    // Skill-based adjustments
    if (userProfile.skillLevel === 'Beginner' && waveHeight < 1.0) {
      score += 10; // Bonus for safe learning conditions
    }
    
    if (userProfile.skillLevel === 'Advanced' && waveHeight > 2.0) {
      score += 10; // Bonus for challenging waves
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Wind Quality Score
   * Evaluates wind conditions relative to preferences
   */
  calculateWindScore(predictions, userProfile) {
    const { windSpeed, windDirection } = predictions;
    const preferred = userProfile.preferredWindSpeed || 15;
    
    // Calculate difference from preferred speed
    const speedDiff = Math.abs(windSpeed - preferred);
    let score = 100 - (speedDiff * 2.5);
    
    // Offshore wind bonus (270-360° for south coast)
    if (windDirection >= 270 && windDirection <= 360) {
      score += 20;
    } else if (windDirection >= 180 && windDirection < 270) {
      // Side-shore - neutral
      score += 5;
    } else {
      // Onshore - penalty
      score -= 15;
    }
    
    // Light winds bonus (glassy conditions)
    if (windSpeed < 8) {
      score += 15;
    }
    
    // Strong winds penalty
    if (windSpeed > 30) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * MAIN CALCULATION: Enhanced Multi-Factor Suitability
   * Combines all innovations into a comprehensive scoring system
   */
  calculateEnhancedSuitability(spot, predictions, userProfile, currentTime = moment()) {
    // Calculate all factor scores
    const waveScore = this.calculateWaveScore(predictions, userProfile);
    const windScore = this.calculateWindScore(predictions, userProfile);
    const timeScore = this.calculateTimeScore(predictions, currentTime.hour());
    const crowdData = this.predictCrowdLevel(spot, currentTime);
    const safetyData = this.calculateSafetyScore(predictions, spot, userProfile.skillLevel);
    const consistencyScore = this.calculateConsistencyScore(predictions);
    
    // Get adaptive weights based on skill level and user preferences
    const weights = this.getAdaptiveWeights(userProfile.skillLevel, userProfile);
    
    // Calculate weighted final score
    const weightedScore = 
      (waveScore * weights.wave) +
      (windScore * weights.wind) +
      (timeScore * weights.time) +
      (crowdData.score * weights.crowd) +
      (safetyData.score * weights.safety) +
      (consistencyScore * weights.consistency);
    
    // Region preference bonus
    let regionBonus = 0;
    if (userProfile.preferredRegion && spot.region === userProfile.preferredRegion) {
      regionBonus = 5;
    }
    
    // Calculate final score
    let finalScore = Math.min(100, weightedScore + regionBonus);
    
    // Safety override: If conditions are dangerous, cap the score
    if (!safetyData.canSurf) {
      finalScore = Math.min(finalScore, 35);
    }
    
    // Determine suitability level
    let suitabilityLevel;
    if (finalScore >= 80) {
      suitabilityLevel = 'Excellent';
    } else if (finalScore >= 65) {
      suitabilityLevel = 'Good';
    } else if (finalScore >= 50) {
      suitabilityLevel = 'Fair';
    } else if (finalScore >= 35) {
      suitabilityLevel = 'Poor';
    } else {
      suitabilityLevel = 'Unsuitable';
    }
    
    // Build breakdown object
    const breakdown = {
      overall: Math.round(finalScore),
      wave: Math.round(waveScore),
      wind: Math.round(windScore),
      time: Math.round(timeScore),
      crowd: crowdData.score,
      safety: safetyData.score,
      consistency: Math.round(consistencyScore)
    };
    
    // Generate smart recommendations
    const recommendations = this.generateRecommendations(
      finalScore,
      breakdown,
      crowdData,
      safetyData,
      spot,
      currentTime
    );
    
    // Generate safety warnings
    const warnings = this.generateWarnings(breakdown, safetyData, spot, predictions);
    const canSurf = warnings.length === 0 || !warnings.some(w => w.severity === 'high');
    
    return {
      score: Math.round(finalScore),
      suitability: suitabilityLevel,
      breakdown,
      weights,
      recommendations,
      warnings,
      canSurf,
      timestamp: currentTime.toISOString()
    };
  }

  /**
   * Generate Safety Warnings
   * @param {Object} breakdown - Score breakdown
   * @param {Object} safetyData - Safety data object
   * @param {Object} spot - Spot data
   * @param {Object} predictions - Forecast predictions
   * @returns {Array} Array of warning objects
   */
  generateWarnings(breakdown, safetyData, spot, predictions) {
    const warnings = [];
    
    // High wind warning
    if (predictions.windSpeed > 35) {
      warnings.push({
        severity: 'high',
        message: 'Strong winds - dangerous conditions',
        icon: '⚠️'
      });
    } else if (predictions.windSpeed > 25) {
      warnings.push({
        severity: 'medium',
        message: 'Strong winds expected',
        icon: '💨'
      });
    }
    
    // Large swell warning
    if (predictions.waveHeight > 3.5) {
      warnings.push({
        severity: 'high',
        message: 'Large swell - experienced surfers only',
        icon: '🌊'
      });
    } else if (predictions.waveHeight > 2.5) {
      warnings.push({
        severity: 'medium',
        message: 'Large waves - caution advised',
        icon: '🌊'
      });
    }
    
    // Safety score warning
    if (breakdown.safety < 40) {
      warnings.push({
        severity: 'medium',
        message: 'Poor safety conditions - use caution',
        icon: '⚠️'
      });
    }
    
    // Overall low score warning
    if (breakdown.overall < 30) {
      warnings.push({
        severity: 'low',
        message: 'Not recommended for surfing today',
        icon: '❌'
      });
    }
    
    return warnings;
  }
}

module.exports = EnhancedSuitabilityCalculator;
