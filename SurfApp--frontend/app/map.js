// SurfApp--frontend/app/map.js

import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Mapbox from '@rnmapbox/maps';
import { UserContext } from '../context/UserContext';
import { getSpotsData } from '../data/surfApi';

// Set Mapbox access token
const MAPBOX_ACCESS_TOKEN = 'sk.eyJ1IjoiaXQyMjAwMzg1MCIsImEiOiJjbWk1bmxod2wwNmYwMnFzNnkwZmdpd3NvIn0.4JG304IZL8mDcZ24QcYOng';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const MapScreen = () => {
  const { userPreferences, userLocation } = useContext(UserContext);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const fetchAndSetSpots = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get all spots without filtering by location - map shows all spots
        const data = await getSpotsData(userPreferences, userLocation);
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spots for map:", error);
        setError('Failed to load spot data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAndSetSpots();
  }, [userPreferences, userLocation]);

  const getMarkerColor = (suitability) => {
    if (suitability > 75) return '#10b981';
    if (suitability > 50) return '#f59e0b';
    if (suitability > 25) return '#f97316';
    return '#ef4444';
  };

  const getSuitabilityLabel = (suitability) => {
    if (suitability > 75) return 'Excellent';
    if (suitability > 50) return 'Good';
    if (suitability > 25) return 'Fair';
    return 'Poor';
  };

  const handleMarkerPress = (spot) => {
    setSelectedSpot(spot);
    // Animate camera to selected spot
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: spot.coords,
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  };

  const handleCloseInfo = () => {
    setSelectedSpot(null);
  };

  const handleMyLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 11,
        animationDuration: 1000,
      });
    }
  };

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

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>⚠️</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Mapbox.MapView 
        style={styles.map}
        styleURL="mapbox://styles/mapbox/outdoors-v12"
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={7.5}
          centerCoordinate={[80.7718, 7.8731]}
          animationDuration={0}
        />
        
        {/* User location marker */}
        {userLocation && (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Surf spot markers */}
        {spots.map(spot => {
          const lon = parseFloat(spot.coords[0]);
          const lat = parseFloat(spot.coords[1]);

          if (isNaN(lon) || isNaN(lat)) {
            console.warn(`Invalid coordinates for spot: ${spot.name}`);
            return null;
          }
          
          return (
            <Mapbox.PointAnnotation
              key={spot.id}
              id={spot.id}
              coordinate={[lon, lat]}
              onSelected={() => handleMarkerPress(spot)}
            >
              <View style={[
                styles.markerContainer, 
                { backgroundColor: getMarkerColor(spot.suitability) },
                selectedSpot?.id === spot.id && styles.markerSelected
              ]}>
                <Text style={styles.markerText}>{spot.suitability.toFixed(0)}</Text>
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>

      {/* My Location Button */}
      {userLocation && (
        <Pressable 
          style={styles.myLocationButton}
          onPress={handleMyLocation}
        >
          <Text style={styles.myLocationIcon}>📍</Text>
        </Pressable>
      )}

      {/* Spot Info Card */}
      {selectedSpot && (
        <View style={styles.infoCard}>
          <Pressable 
            style={styles.closeButton}
            onPress={handleCloseInfo}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
          
          <Text style={styles.spotName}>{selectedSpot.name}</Text>
          <Text style={styles.spotRegion}>{selectedSpot.region}</Text>
          
          {selectedSpot.distance !== undefined && (
            <Text style={styles.spotDistance}>📍 {selectedSpot.distance}km away</Text>
          )}

          <View style={styles.infoRow}>
            <LinearGradient
              colors={[getMarkerColor(selectedSpot.suitability), getMarkerColor(selectedSpot.suitability)]}
              style={styles.suitabilityBadge}
            >
              <Text style={styles.suitabilityLabel}>{getSuitabilityLabel(selectedSpot.suitability)}</Text>
              <Text style={styles.suitabilityScore}>{selectedSpot.suitability.toFixed(0)}%</Text>
            </LinearGradient>
          </View>

          <View style={styles.forecastGrid}>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastIcon}>🌊</Text>
              <Text style={styles.forecastValue}>{selectedSpot.forecast?.waveHeight}m</Text>
              <Text style={styles.forecastLabel}>Wave</Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastIcon}>💨</Text>
              <Text style={styles.forecastValue}>{selectedSpot.forecast?.windSpeed} kph</Text>
              <Text style={styles.forecastLabel}>Wind</Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastIcon}>🌙</Text>
              <Text style={styles.forecastValue}>{selectedSpot.forecast?.tide?.status}</Text>
              <Text style={styles.forecastLabel}>Tide</Text>
            </View>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Excellent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Good</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Fair</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Poor</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
  },
  markerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  myLocationIcon: {
    fontSize: 28,
  },
  legend: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  spotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  spotRegion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  spotDistance: {
    fontSize: 13,
    color: '#0ea5e9',
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  suitabilityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  suitabilityLabel: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suitabilityScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  forecastGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  forecastItem: {
    alignItems: 'center',
  },
  forecastIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  forecastLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});

export default MapScreen;