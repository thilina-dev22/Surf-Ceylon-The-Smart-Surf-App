import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SpotCard = ({ spot, onPress, testID }) => {
  const waveHeight = spot?.forecast?.waveHeight ?? '?';
  const wavePeriod = spot?.forecast?.wavePeriod ?? '?';
  const windSpeed = spot?.forecast?.windSpeed ?? '?';
  const windDirection = spot?.forecast?.windDirection ?? '?';
  const tideStatus = spot?.forecast?.tide?.status ?? '-';
  const suitability = typeof spot?.suitability === 'number' ? spot.suitability.toFixed(0) : '-';

  // Determine color based on suitability
  const getGradientColors = () => {
    const score = parseFloat(suitability);
    if (score >= 75) return ['#4ade80', '#22c55e']; // Green
    if (score >= 50) return ['#fbbf24', '#f59e0b']; // Yellow/Orange
    if (score >= 25) return ['#fb923c', '#f97316']; // Orange
    return ['#f87171', '#ef4444']; // Red
  };

  const getSuitabilityLabel = () => {
    const score = parseFloat(suitability);
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${spot?.name}`}
      testID={testID}
    >
      <View style={styles.cardContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{spot?.name}</Text>
            <Text style={styles.region}>{spot?.region}</Text>
          </View>
          
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreContainer}
          >
            <Text style={styles.scoreLabel}>{getSuitabilityLabel()}</Text>
            <Text style={styles.score}>{suitability}%</Text>
          </LinearGradient>
        </View>

        {/* Forecast Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🌊</Text>
            <View>
              <Text style={styles.detailLabel}>Wave</Text>
              <Text style={styles.detailValue}>{waveHeight}m @ {wavePeriod}s</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💨</Text>
            <View>
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{windSpeed} kph</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🧭</Text>
            <View>
              <Text style={styles.detailLabel}>Direction</Text>
              <Text style={styles.detailValue}>{windDirection}°</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🌙</Text>
            <View>
              <Text style={styles.detailLabel}>Tide</Text>
              <Text style={styles.detailValue}>{tideStatus}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { 
    backgroundColor: 'white', 
    marginVertical: 8, 
    marginHorizontal: 16, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 8, 
    elevation: 5,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  name: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  region: { 
    fontSize: 14, 
    color: '#6b7280',
  },
  scoreContainer: { 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: { 
    fontSize: 11, 
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  score: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'white',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default SpotCard;