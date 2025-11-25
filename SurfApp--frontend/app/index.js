// SurfApp--frontend/app/index.js
import React, { useContext, useState, useEffect } from 'react';
import { Text, StyleSheet, ActivityIndicator, View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UserContext } from '../context/UserContext';
import { getSpotsData } from '../data/surfApi'; 
import { filterSpotsByRadius } from '../data/locationUtils';
import SpotCard from '../components/SpotCard';

const HomeScreen = () => {
  const { userPreferences, userLocation, locationLoading, user } = useContext(UserContext);
  const router = useRouter();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSpots = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      // If no user, we use default preferences (Beginner) which are already in userPreferences
      const data = await getSpotsData(userPreferences, userLocation); 
      
      // Filter spots by 10km radius if user location is available
      const filteredSpots = filterSpotsByRadius(data, userLocation, 10);
      setSpots(filteredSpots);
    } catch (e) {
      console.error("Error fetching spots for home screen:", e);
      setError("Failed to load surf spots. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots(true);
  };
  
  useEffect(() => {
    // Wait for location to be loaded before fetching spots
    if (!locationLoading) {
      fetchSpots();
    }
  }, [userPreferences, userLocation, locationLoading]); 

  const topPick = spots[0];
  const nextBestSpots = spots.slice(1, 4);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0ea5e9', '#06b6d4', '#14b8a6']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Finding the best waves for you...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#ffffff']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.greeting}>
              {user ? `Welcome back, ${user.name.split(' ')[0]}! 🏄‍♂️` : 'Welcome to Surf Ceylon! 🏄‍♂️'}
            </Text>
            <Text style={styles.headerTitle}>
              {user ? `${userPreferences.skillLevel} Surfer` : 'Find Your Wave'}
            </Text>
            
            {!user && (
              <Pressable 
                style={styles.loginBanner}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.loginBannerText}>
                  ✨ Log in for personalized recommendations
                </Text>
              </Pressable>
            )}

            {userLocation ? (
              <Text style={styles.subtitle}>
                📍 Showing {spots.length} spots within 10km of your location
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                We found {spots.length} spots matching {user ? 'your preferences' : 'default settings'}
              </Text>
            )}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : !topPick ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌊</Text>
              <Text style={styles.emptyTitle}>No spots nearby</Text>
              <Text style={styles.emptyText}>
                {userLocation 
                  ? 'No surf spots found within 10km. Check the map to see all spots!' 
                  : 'Try adjusting your preferences to see more results'}
              </Text>
            </View>
          ) : (
            <>
              {/* Top Recommendation */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🏆 Top Recommendation</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>BEST MATCH</Text>
                  </View>
                </View>
                <SpotCard spot={topPick} origin="home" />
              </View>

              {/* Other Good Spots */}
              {nextBestSpots.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>✨ Also Worth Checking</Text>
                  {nextBestSpots.map((spot) => (
                    <SpotCard key={spot.id} spot={spot} origin="home" />
                  ))}
                </View>
              )}

              {/* View All Button */}
              <Pressable 
                style={styles.viewAllButton}
                onPress={() => router.push('/(spots)')}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewAllGradient}
                >
                  <Text style={styles.viewAllText}>View All {spots.length} Spots</Text>
                  <Text style={styles.viewAllArrow}>→</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerSection: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  viewAllGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  viewAllText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  viewAllArrow: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    margin: 20,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  loginBanner: {
    backgroundColor: '#e0f2fe',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  loginBannerText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomeScreen;