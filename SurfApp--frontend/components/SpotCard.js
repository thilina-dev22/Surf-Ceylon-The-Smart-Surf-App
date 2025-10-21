import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SpotCard = ({ spot, onPress, testID }) => {
  const waveHeight = spot?.forecast?.waveHeight ?? '?';
  const wavePeriod = spot?.forecast?.wavePeriod ?? '?';
  const windSpeed = spot?.forecast?.windSpeed ?? '?';
  const suitability = typeof spot?.suitability === 'number' ? spot.suitability.toFixed(0) : '-';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${spot?.name}`}
      testID={testID}
      activeOpacity={0.8}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{spot?.name}</Text>
        <Text style={styles.region}>{spot?.region}</Text>
        {/* Display the richer forecast data from the backend */}
        <Text style={styles.details}>
          Wave: {waveHeight}m @ {wavePeriod}s
        </Text>
        <Text style={styles.details}>Wind: {windSpeed} kph</Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Suitability</Text>
        <Text style={styles.score}>{suitability}%</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    marginVertical: 8, 
    marginHorizontal: 10, 
    borderRadius: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  infoContainer: { flex: 3 },
  scoreContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  region: { fontSize: 14, color: '#888', marginBottom: 5 },
  details: { fontSize: 14 },
  scoreLabel: { fontSize: 12, color: '#555' },
  score: { fontSize: 24, fontWeight: 'bold', color: '#007bff' },
});

export default SpotCard;