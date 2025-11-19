import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ForecastChart from '../../components/ForecastChart';

const SpotDetailScreen = () => {
  const params = useLocalSearchParams();
  let spot = null;
  try {
    spot = params && params.spot ? JSON.parse(params.spot) : null;
  } catch (e) {
    console.warn('Failed to parse spot param from navigation', e);
  }

  if (!spot) {
    return (
      <>
        <Stack.Screen options={{ title: 'Spot Details' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Spot details could not be loaded.</Text>
        </View>
      </>
    );
  }

  const forecast = spot.forecast || {};
  const tide = forecast.tide || {};
  const suitability = typeof spot.suitability === 'number' ? spot.suitability : 0;

  const getGradientColors = () => {
    if (suitability >= 75) return ['#4ade80', '#22c55e'];
    if (suitability >= 50) return ['#fbbf24', '#f59e0b'];
    if (suitability >= 25) return ['#fb923c', '#f97316'];
    return ['#f87171', '#ef4444'];
  };

  const getSuitabilityLabel = () => {
    if (suitability >= 75) return 'Excellent Conditions';
    if (suitability >= 50) return 'Good Conditions';
    if (suitability >= 25) return 'Fair Conditions';
    return 'Poor Conditions';
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: spot.name,
          headerStyle: { backgroundColor: '#0ea5e9' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      <ScrollView style={styles.container}>
        {/* Hero Section */}
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>{spot.name}</Text>
          <Text style={styles.heroRegion}>{spot.region}</Text>
          <View style={styles.heroScore}>
            <Text style={styles.heroScoreNumber}>{suitability.toFixed(0)}%</Text>
            <Text style={styles.heroScoreLabel}>{getSuitabilityLabel()}</Text>
          </View>
        </LinearGradient>

        {/* Current Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌊 Current Conditions</Text>
          
          <View style={styles.conditionsGrid}>
            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🌊</Text>
              <Text style={styles.conditionLabel}>Wave Height</Text>
              <Text style={styles.conditionValue}>{forecast.waveHeight}m</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>⏱️</Text>
              <Text style={styles.conditionLabel}>Wave Period</Text>
              <Text style={styles.conditionValue}>{forecast.wavePeriod}s</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>💨</Text>
              <Text style={styles.conditionLabel}>Wind Speed</Text>
              <Text style={styles.conditionValue}>{forecast.windSpeed} kph</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🧭</Text>
              <Text style={styles.conditionLabel}>Wind Direction</Text>
              <Text style={styles.conditionValue}>{forecast.windDirection}°</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🌙</Text>
              <Text style={styles.conditionLabel}>Tide Status</Text>
              <Text style={styles.conditionValue}>{tide.status}</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>📊</Text>
              <Text style={styles.conditionLabel}>Score</Text>
              <Text style={styles.conditionValue}>{suitability.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        {/* Forecast Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 7-Day Wave Forecast</Text>
          <View style={styles.chartContainer}>
            <ForecastChart />
          </View>
        </View>

        {/* Tips Section */}
        <View style={[styles.section, styles.tipsSection]}>
          <Text style={styles.sectionTitle}>💡 Surf Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🏄‍♂️</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Best For</Text>
              <Text style={styles.tipText}>
                {suitability >= 75 ? 'All skill levels - Perfect conditions!' :
                 suitability >= 50 ? 'Intermediate to Advanced surfers' :
                 suitability >= 25 ? 'Experienced surfers only' :
                 'Challenging conditions - Exercise caution'}
              </Text>
            </View>
          </View>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>⏰</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Recommended Time</Text>
              <Text style={styles.tipText}>
                {tide.status === 'High' ? 'High tide - Good for beginners' :
                 tide.status === 'Low' ? 'Low tide - Watch for rocks' :
                 'Mid tide - Generally good conditions'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    padding: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  heroRegion: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  heroScore: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroScoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  heroScoreLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  conditionCard: {
    width: '33.33%',
    padding: 6,
  },
  conditionCardInner: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  conditionLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsSection: {
    backgroundColor: '#f1f5f9',
    marginTop: 10,
  },
  tipCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default SpotDetailScreen;