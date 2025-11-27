import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

const ActiveSessionBanner = () => {
  const router = useRouter();
  const { activeSessionId, activeSessionSpot, setSelectedSpot } = useUser();

  if (!activeSessionId || !activeSessionSpot) {
    return null;
  }

  const handleBannerPress = () => {
    // Set the selected spot so the detail page can access it
    setSelectedSpot(activeSessionSpot);
    // Navigate to the spot detail page where the session can be ended
    router.push(`/(spots)/detail?origin=banner`);
  };

  return (
    <TouchableOpacity 
      style={styles.banner} 
      onPress={handleBannerPress}
      activeOpacity={0.8}
    >
      <View style={styles.bannerContent}>
        <Ionicons name="recording" size={16} color="#fff" style={styles.icon} />
        <Text style={styles.bannerText}>
          Session in progress at {activeSessionSpot.name}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#b91c1c',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default ActiveSessionBanner;
