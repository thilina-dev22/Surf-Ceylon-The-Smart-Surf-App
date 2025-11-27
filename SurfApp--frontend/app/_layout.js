import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { UserProvider } from '../context/UserContext';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen'; 
import { View } from 'react-native';
import ActiveSessionBanner from '../components/ActiveSessionBanner';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function AppLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <UserProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <ActiveSessionBanner />
        <Tabs screenOptions={{ tabBarActiveTintColor: '#007bff' }}> 
          <Tabs.Screen 
            name="index" 
            options={{ 
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }} 
          />
          <Tabs.Screen 
            name="(spots)" 
            options={{ 
              title: 'Spots', 
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="location-sharp" size={size} color={color} />
              ),
            }} 
          />
          <Tabs.Screen 
            name="map" 
            options={{ 
              title: 'Map',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="map" size={size} color={color} />
              ),
            }} 
          />
          <Tabs.Screen 
            name="profile" 
            options={{ 
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }} 
          />
          <Tabs.Screen 
            name="login" 
            options={{ 
              href: null,
              headerShown: false,
            }} 
          />
          <Tabs.Screen 
            name="register" 
            options={{ 
              href: null,
              headerShown: false,
            }} 
          />
        </Tabs>
      </View>
    </UserProvider>
  );
}