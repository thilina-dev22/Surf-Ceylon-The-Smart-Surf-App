import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SuitabilityRadarChart from './SuitabilityRadarChart';

/**
 * Score Breakdown Component - Phase 4 Visual Scoring
 * Displays detailed breakdown of all scoring factors with visual indicators
 */

const ScoreBreakdown = ({ breakdown, recommendations = [], weights = {}, warnings = [] }) => {
  /**
   * Helper to ensure safe numbers
   */
  const safeNumber = (val) => (typeof val === 'number' && !isNaN(val)) ? val : 0;

  /**
   * Get color based on score value
   */
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#3b82f6'; // Blue
    if (score >= 40) return '#fb923c'; // Orange
    return '#ef4444'; // Red
  };
  
  /**
   * Get color scheme for radar chart
   */
  const getColorScheme = (overallScore) => {
    if (overallScore >= 80) return 'green';
    if (overallScore >= 60) return 'default';
    if (overallScore >= 40) return 'orange';
    return 'red';
  };
  
  /**
   * Get grade from score
   */
  const getGrade = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };
  
  /**
   * Render individual score item
   */
  const renderScoreItem = (label, score, icon, description) => {
    const color = getScoreColor(score);
    const width = `${Math.max(0, Math.min(100, score))}%`;
    
    return (
      <View 
        style={styles.scoreItem} 
        key={label}
        accessible={true}
        accessibilityLabel={`${label}: ${Math.round(score)} out of 100. ${description || ''}`}
      >
        <View style={styles.scoreHeader}>
          <View style={styles.scoreLabel}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={styles.scoreLabelText}>{label}</Text>
          </View>
          <Text style={[styles.scoreValue, { color }]}>{Math.round(score)}</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width, backgroundColor: color }]} />
        </View>
        
        {description && (
          <Text style={styles.scoreDescription}>{description}</Text>
        )}
      </View>
    );
  };
  
  /**
   * Render warnings
   */
  const renderWarnings = () => {
    if (!warnings || warnings.length === 0) return null;
    
    return (
      <View style={styles.warningsContainer}>
        <Text style={styles.warningsTitle}>⚠️ Safety Warnings</Text>
        {warnings.map((warning, index) => (
          <View key={index} style={styles.warningItem}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        ))}
      </View>
    );
  };
  
  /**
   * Render recommendations
   */
  const renderRecommendations = () => {
    if (!recommendations || recommendations.length === 0) return null;
    
    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>💡 Recommendations</Text>
        {recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.recommendationBullet}>•</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    );
  };
  
  /**
   * Render adaptive weights
   */
  const renderWeights = () => {
    if (!weights || Object.keys(weights).length === 0) return null;
    
    return (
      <View style={styles.weightsContainer}>
        <Text style={styles.weightsTitle}>⚖️ Score Weights (Personalized)</Text>
        <View style={styles.weightsGrid}>
          {Object.entries(weights).map(([key, value]) => (
            <View key={key} style={styles.weightItem}>
              <Text style={styles.weightLabel}>{key}</Text>
              <Text style={styles.weightValue}>{Math.round(value * 100)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  if (!breakdown) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No scoring data available</Text>
      </View>
    );
  }
  
  const overallScore = safeNumber(breakdown.overall);
  const colorScheme = getColorScheme(overallScore);
  
  return (
    <View style={styles.container}>
      {/* Overall Score Header */}
      <View style={styles.overallContainer}>
        <Text style={styles.overallLabel}>Overall Suitability</Text>
        <Text style={[styles.overallScore, { color: getScoreColor(overallScore) }]}>
          {Math.round(overallScore)}
        </Text>
        <Text style={styles.overallGrade}>Grade: {getGrade(overallScore)}</Text>
      </View>
      
      {/* Radar Chart */}
      <View style={styles.chartContainer}>
        <SuitabilityRadarChart
          scores={{
            wave: safeNumber(breakdown.wave),
            wind: safeNumber(breakdown.wind),
            time: safeNumber(breakdown.time),
            crowd: safeNumber(breakdown.crowd),
            safety: safeNumber(breakdown.safety),
            consistency: safeNumber(breakdown.consistency)
          }}
          overallScore={overallScore}
          size={280}
          colorScheme={colorScheme}
        />
      </View>
      
      {/* Warnings */}
      {renderWarnings()}
      
      {/* Detailed Scores */}
      <View style={styles.scoresContainer}>
        <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
        
        {renderScoreItem(
          'Wave Quality',
          safeNumber(breakdown.wave),
          'water',
          'Wave height, period, and swell quality'
        )}
        
        {renderScoreItem(
          'Wind Conditions',
          safeNumber(breakdown.wind),
          'navigate',
          'Wind speed and direction favorability'
        )}
        
        {renderScoreItem(
          'Timing',
          safeNumber(breakdown.time),
          'time',
          'Golden hours, tide, and offshore winds'
        )}
        
        {renderScoreItem(
          'Crowd Level',
          safeNumber(breakdown.crowd),
          'people',
          'Expected crowd density'
        )}
        
        {renderScoreItem(
          'Safety',
          safeNumber(breakdown.safety),
          'shield-checkmark',
          'Conditions matched to your skill level'
        )}
        
        {renderScoreItem(
          'Consistency',
          safeNumber(breakdown.consistency),
          'pulse',
          'Wave period and wind stability'
        )}
      </View>
      
      {/* Adaptive Weights */}
      {renderWeights()}
      
      {/* Recommendations */}
      {renderRecommendations()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
  },
  overallContainer: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  overallLabel: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  overallGrade: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  warningsContainer: {
    backgroundColor: '#fef2f2',
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#991b1b',
    marginLeft: 8,
    flex: 1,
  },
  scoresContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  scoreItem: {
    marginBottom: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  weightsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  weightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  weightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  weightItem: {
    width: '50%',
    padding: 8,
  },
  weightLabel: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  weightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 2,
  },
  recommendationsContainer: {
    backgroundColor: '#eff6ff',
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#3b82f6',
    marginRight: 8,
    marginTop: -2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1e40af',
    flex: 1,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    padding: 32,
  },
});

export default ScoreBreakdown;
