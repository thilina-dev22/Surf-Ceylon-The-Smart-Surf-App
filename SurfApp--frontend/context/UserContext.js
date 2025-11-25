import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOST = Platform.select({ 
  android: '10.0.2.2',
  default: '127.0.0.1' 
});
const API_URL = `http://${HOST}:3000/api`;

export const UserContext = createContext();

// Custom hook for easier access to user context
export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null); // Keep for backward compatibility with existing components

  // Auth functions
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setUserId(data.user.id);
      
      // Ensure skillLevel is included in preferences
      const prefs = data.user.preferences || {};
      setUserPreferences({
        ...prefs,
        skillLevel: data.user.skillLevel || 'Beginner'
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name, email, password, skillLevel, preferences = {}) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          skillLevel,
          ...preferences 
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setUserId(data.user.id);
      
      // Ensure skillLevel is included in preferences
      const prefs = data.user.preferences || {};
      setUserPreferences({
        ...prefs,
        skillLevel: data.user.skillLevel || skillLevel || 'Beginner'
      });
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setToken(null);
    setUser(null);
    setUserId(null);
    setUserPreferences({
      skillLevel: 'Beginner',
      minWaveHeight: 0.5,
      maxWaveHeight: 1.5,
      tidePreference: 'Any',
      boardType: 'Soft-top',
    });
  };

  const updateUserPreferences = async (newPreferences) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(`${API_URL}/auth/preferences`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences: newPreferences }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update preferences');
      
      // Update local storage and state
      // Update top-level skillLevel if it changed
      const updatedUser = { 
        ...user, 
        preferences: newPreferences,
        skillLevel: newPreferences.skillLevel || user.skillLevel
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      setUser(updatedUser);
      setUserPreferences(newPreferences);
      
      return true;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  };

  // Check for logged in user on app start
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setUserId(parsedUser.id);
          
          // Merge preferences with skillLevel
          const prefs = parsedUser.preferences || {};
          setUserPreferences({
            ...prefs,
            skillLevel: parsedUser.skillLevel || 'Beginner'
          });
        }
      } catch (e) {
        console.error('Auth check failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);
  
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
  
  // Store selected spot for detail navigation (avoids URL param size limits)
  const [selectedSpot, setSelectedSpot] = useState(null);

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
    userId,
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    userPreferences, 
    setUserPreferences,
    updateUserPreferences,
    userLocation,
    locationError,
    locationLoading,
    selectedSpot,
    setSelectedSpot,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};