import { UserContext } from '../../context/UserContext';
import { getSpotsData } from '../../data/surfApi'; 
import SpotCard from '../../components/SpotCard';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, ActivityIndicator, View, Text, Pressable, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const SpotsListScreen = () => {
  const { userPreferences, userLocation, user, userId } = useContext(UserContext);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, excellent, good, fair

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const fetchSpots = useCallback(async () => {
    try {
      setLoading(true);
      // Get all spots with distance info - no filtering by location on this screen
      const data = await getSpotsData(userPreferences, userLocation, userId);
      setSpots(data);
    } catch (e) {
      console.error("Error fetching spots for list screen:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userPreferences, userLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots();
  };

  const getFilteredSpots = () => {
    if (filter === 'all') return spots;
    if (filter === 'excellent') return spots.filter(s => s.score >= 75);
    if (filter === 'good') return spots.filter(s => s.score >= 50 && s.score < 75);
    if (filter === 'fair') return spots.filter(s => s.score < 50);
    return spots;
  };

  const filteredSpots = getFilteredSpots();

  if (loading) {
    return (
      <LinearGradient
        colors={['#0ea5e9', '#06b6d4', '#14b8a6']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading surf spots...</Text>
      </LinearGradient>
    );
  }

  const FilterButton = ({ label, value, count }) => (
    <Pressable
      onPress={() => setFilter(value)}
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.filterBadge, filter === value && styles.filterBadgeActive]}>
          <Text style={[styles.filterBadgeText, filter === value && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#ffffff']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {/* Guest Banner */}
        {!user && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText}>
              Showing suitability for Beginner level (Default)
            </Text>
          </View>
        )}

        {/* Filter Section */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterButton 
              label="All Spots" 
              value="all" 
              count={spots.length} 
            />
            <FilterButton 
              label="Excellent" 
              value="excellent" 
              count={spots.filter(s => s.score >= 75).length} 
            />
            <FilterButton 
              label="Good" 
              value="good" 
              count={spots.filter(s => s.score >= 50 && s.score < 75).length} 
            />
            <FilterButton 
              label="Fair" 
              value="fair" 
              count={spots.filter(s => s.score < 50).length} 
            />
          </ScrollView>
        </View>

        {filteredSpots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏄‍♂️</Text>
            <Text style={styles.emptyTitle}>No spots in this category</Text>
            <Text style={styles.emptyText}>Try a different filter</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSpots}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SpotCard spot={item} origin="spots" />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
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
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: 'white',
  },
  filterBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  filterBadgeTextActive: {
    color: 'white',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
  guestBanner: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  guestBannerText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SpotsListScreen;