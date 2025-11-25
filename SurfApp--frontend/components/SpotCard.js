import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from '../context/UserContext';

const SpotCard = ({ spot, testID, origin }) => {
  const router = useRouter();
  const { setSelectedSpot } = useUser();
  
  const waveHeight = spot?.forecast?.waveHeight ?? '?';
  const wavePeriod = spot?.forecast?.wavePeriod ?? '?';
  const windSpeed = spot?.forecast?.windSpeed ?? '?';
  const windDirection = spot?.forecast?.windDirection ?? '?';
  const tideStatus = spot?.forecast?.tide?.status ?? '-';
  
  // Use spot.score (number) for calculations, spot.suitability (string) for label
  const score = typeof spot?.score === 'number' && !isNaN(spot.score) ? spot.score : 0;
  const suitabilityLabel = spot?.suitability || 'Unknown';
  
  // Enhanced breakdown data (Phase 1)
  const breakdown = spot?.breakdown || {};
  const hasWarnings = spot?.warnings && spot?.warnings.length > 0;
  const canSurf = spot?.canSurf !== undefined ? spot.canSurf : true;
  
  const handlePress = () => {
    setSelectedSpot(spot);
    router.push({ pathname: '/(spots)/detail', params: { origin } });
  };
  // Debug logging
  if (spot?.name === 'Midigama') {
    console.log('Midigama card - distance:', spot.distance, 'type:', typeof spot.distance);
  }

  // Determine color based on score
  const getGradientColors = () => {
    if (score >= 75) return ['#4ade80', '#22c55e']; // Green
    if (score >= 50) return ['#fbbf24', '#f59e0b']; // Yellow/Orange
    if (score >= 25) return ['#fb923c', '#f97316']; // Orange
    return ['#f87171', '#ef4444']; // Red
  };

  return (
    <Pressable
      onPress={handlePress}
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
            <View style={styles.regionRow}>
              <Text style={styles.region}>{spot?.region}</Text>
              {spot?.distance !== undefined && spot?.distance !== null && (
                <Text style={styles.distance}>• {spot.distance}km away</Text>
              )}
            </View>
          </View>
          
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreContainer}
          >
            <Text style={styles.scoreLabel}>{suitabilityLabel}</Text>
            <Text style={styles.score}>{Math.round(score)}%</Text>
            {!canSurf && <Text style={styles.warningBadge}>⚠️</Text>}
          </LinearGradient>
        </View>

        {/* Warning Banner */}
        {hasWarnings && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>Safety warnings - tap for details</Text>
          </View>
        )}

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
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  region: { 
    fontSize: 14, 
    color: '#6b7280',
  },
  distance: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
    marginLeft: 6,
  },
  scoreContainer: { 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: { 
    fontSize: 10, 
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  score: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: 'white',
    lineHeight: 26,
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
  warningBanner: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  warningBadge: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SpotCard;