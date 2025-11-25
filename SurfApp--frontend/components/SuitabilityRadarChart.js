import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';

// Define factors and their positions
const factors = [
  { key: 'wave', label: 'Wave Quality', angle: 0 },
  { key: 'wind', label: 'Wind', angle: 60 },
  { key: 'time', label: 'Timing', angle: 120 },
  { key: 'crowd', label: 'Crowd', angle: 180 },
  { key: 'safety', label: 'Safety', angle: 240 },
  { key: 'consistency', label: 'Consistency', angle: 300 }
];

/**
 * Radar Chart Component - Phase 4 Visual Scoring
 * Displays multi-factor suitability scores in an intuitive radar/spider chart
 */

const SuitabilityRadarChart = ({ 
  scores, 
  overallScore,
  size = 280,
  maxScore = 100,
  showLabels = true,
  showGrid = true,
  colorScheme = 'default'
}) => {
  const center = size / 2;
  const radius = (size / 2) - 50; // Leave space for labels
  
  // Color schemes
  const colors = {
    default: {
      polygon: 'rgba(59, 130, 246, 0.3)', // Blue
      line: '#3b82f6',
      grid: '#e5e7eb',
      text: '#374151'
    },
    green: {
      polygon: 'rgba(34, 197, 94, 0.3)', // Green
      line: '#22c55e',
      grid: '#e5e7eb',
      text: '#374151'
    },
    orange: {
      polygon: 'rgba(251, 146, 60, 0.3)', // Orange
      line: '#fb923c',
      grid: '#e5e7eb',
      text: '#374151'
    },
    red: {
      polygon: 'rgba(239, 68, 68, 0.3)', // Red
      line: '#ef4444',
      grid: '#e5e7eb',
      text: '#374151'
    }
  };
  
  const theme = colors[colorScheme] || colors.default;

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
   * Convert polar coordinates to cartesian
   */
  const polarToCartesian = useCallback((angle, distance) => {
    const radians = (angle - 90) * (Math.PI / 180);
    return {
      x: center + distance * Math.cos(radians),
      y: center + distance * Math.sin(radians)
    };
  }, [center]);

  // Memoize the chart data preparation
  const { chartScores, points } = useMemo(() => {
    // Default scores structure
    const defaultScores = {
      wave: 0,
      wind: 0,
      time: 0,
      crowd: 0,
      safety: 0,
      consistency: 0
    };
    
    // Merge and sanitize scores to prevent NaN errors in SVG
    const rawScores = { ...defaultScores, ...scores };
    const processedScores = {};
    Object.keys(rawScores).forEach(key => {
      const val = rawScores[key];
      // Ensure we have a valid number
      processedScores[key] = (typeof val === 'number' && !isNaN(val)) ? val : 0;
    });

    const polyPoints = factors.map(factor => {
      const score = processedScores[factor.key] || 0;
      const distance = (score / maxScore) * radius;
      const point = polarToCartesian(factor.angle, distance);
      return `${point.x},${point.y}`;
    }).join(' ');

    return { chartScores: processedScores, points: polyPoints };
  }, [scores, maxScore, radius, polarToCartesian]);
  
  /**
   * Generate grid circles
   */
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    
    return gridLevels.map((level, index) => (
      <Circle
        key={`grid-${index}`}
        cx={center}
        cy={center}
        r={radius * level}
        stroke={theme.grid}
        strokeWidth="1"
        fill="none"
      />
    ));
  };
  
  /**
   * Generate axis lines
   */
  const renderAxes = () => {
    return factors.map((factor, index) => {
      const end = polarToCartesian(factor.angle, radius);
      return (
        <Line
          key={`axis-${index}`}
          x1={center}
          y1={center}
          x2={end.x}
          y2={end.y}
          stroke={theme.grid}
          strokeWidth="1"
        />
      );
    });
  };
  
  /**
   * Generate score polygon
   */
  const renderScorePolygon = () => {
    return (
      <>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22c55e" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Polygon
          points={points}
          fill="url(#scoreGradient)"
          stroke={theme.line}
          strokeWidth="2"
          fillOpacity="0.8"
        />
        {factors.map((factor, index) => {
          const score = chartScores[factor.key] || 0;
          const distance = (score / maxScore) * radius;
          const point = polarToCartesian(factor.angle, distance);
          return (
            <Circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={theme.line}
            />
          );
        })}
      </>
    );
  };
  
  /**
   * Generate labels
   */
  const renderLabels = () => {
    if (!showLabels) return null;
    
    return factors.map((factor, index) => {
      const labelDistance = radius + 20;
      const labelPos = polarToCartesian(factor.angle, labelDistance);
      const score = chartScores[factor.key] || 0;
      
      // Adjust text anchor based on position
      let textAnchor = 'middle';
      if (labelPos.x < center - 10) textAnchor = 'end';
      if (labelPos.x > center + 10) textAnchor = 'start';
      
      return (
        <G key={`label-${index}`}>
          <SvgText
            x={labelPos.x}
            y={labelPos.y - 8}
            fontSize="12"
            fontWeight="600"
            fill={theme.text}
            textAnchor={textAnchor}
          >
            {factor.label}
          </SvgText>
          <SvgText
            x={labelPos.x}
            y={labelPos.y + 8}
            fontSize="14"
            fontWeight="bold"
            fill={getScoreColor(score)}
            textAnchor={textAnchor}
          >
            {Math.round(score)}
          </SvgText>
        </G>
      );
    });
  };
  
  /**
   * Generate center score
   */
  const renderCenterScore = () => {
    let displayScore;
    
    if (typeof overallScore === 'number' && !isNaN(overallScore)) {
      displayScore = overallScore;
    } else {
      const values = Object.values(chartScores);
      const totalScore = values.reduce((sum, val) => sum + val, 0);
      displayScore = values.length ? Math.round(totalScore / values.length) : 0;
    }
    
    const scoreColor = getScoreColor(displayScore);
    
    return (
      <G>
        <SvgText
          x={center}
          y={center - 5}
          fontSize="10"
          fill={theme.textSecondary}
          textAnchor="middle"
        >
          Overall
        </SvgText>
        <SvgText
          x={center}
          y={center + 15}
          fontSize="24"
          fontWeight="bold"
          fill={scoreColor}
          textAnchor="middle"
        >
          {Math.round(displayScore)}
        </SvgText>
      </G>
    );
  };
  
  return (
    <View 
      style={{ alignItems: 'center', justifyContent: 'center' }}
      accessible={true}
      accessibilityLabel={`Surf Suitability Chart. Overall Score: ${overallScore || 'Calculating'}`}
      accessibilityRole="image"
    >
      <Svg width={size} height={size}>
        {renderGrid()}
        {renderAxes()}
        {renderScorePolygon()}
        {renderLabels()}
        {renderCenterScore()}
      </Svg>
    </View>
  );
};

export default SuitabilityRadarChart;
