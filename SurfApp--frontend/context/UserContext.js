import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userPreferences, setUserPreferences] = useState({
    skillLevel: 'Beginner',
    minWaveHeight: 0.5,
    maxWaveHeight: 1.5,
    tidePreference: 'Any',
    boardType: 'Soft-top',
  });
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    // Request location permission and get current location
    (async () => {
      try {
        setLocationLoading(true);
        
        // Request foreground permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Location permission denied - app will work without location filtering');
          setLocationError('Location permission denied');
          setLocationLoading(false);
          return;
        }

        // Get current location with timeout
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        // Add a timeout to prevent hanging
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 5000)
        );

        const location = await Promise.race([locationPromise, timeout]);
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationError(null);
        console.log('Location obtained successfully');
      } catch (error) {
        console.log('Location unavailable - using default location (Weligama) for demo:', error.message);
        setLocationError(null); // Don't show error to user, just work without location
        // Set default location to Weligama for demo purposes when GPS is unavailable
        setUserLocation({
          latitude: 5.9721,
          longitude: 80.4264
        });
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const value = { 
    userPreferences, 
    setUserPreferences,
    userLocation,
    locationError,
    locationLoading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};