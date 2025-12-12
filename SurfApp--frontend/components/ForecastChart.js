// Multi-Output 7-Day Surf Forecast Component
// Displays: Wave Height, Wind Speed, and Swell Period charts
import React, { useState, useEffect } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions, ActivityIndicator, View, Text, StyleSheet, ScrollView } from 'react-native';
import { get7DayForecast } from '../data/surfApi';

const ForecastChart = ({ spotId = '2' }) => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width - 40;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await get7DayForecast(spotId);
        setForecastData(data);
      } catch (e) {
        console.error("Failed to load forecast data:", e);
        // Set fallback mock data
        setForecastData({
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
          windSpeed: [15, 14, 16, 13, 15, 14, 15],
          swellPeriod: [12, 13, 12, 14, 13, 12, 12]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [spotId]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading 7-day forecast...</Text>
      </View>
    );
  }

  if (!forecastData || !forecastData.labels) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ Forecast data not available</Text>
      </View>
    );
  }

  // Helper function to add padding to Y-axis for better visualization
  const getPaddedMinMax = (data) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const padding = range * 0.1 || 0.1;
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  };

  const commonChartConfig = {
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#fff'
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.2)',
      strokeWidth: 1
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Wave Height Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>🌊 Wave Height (m)</Text>
          <LineChart
            data={{
              labels: forecastData.labels,
              datasets: [{
                data: forecastData.waveHeight || [1, 1, 1, 1, 1, 1, 1],
                color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
                strokeWidth: 3
              }]
            }}
            width={screenWidth}
            height={240}
            chartConfig={{
              ...commonChartConfig,
              backgroundColor: '#1a73e8',
              backgroundGradientFrom: '#4285f4',
              backgroundGradientTo: '#1a73e8',
              decimalPlaces: 2,
            }}
            style={styles.chart}
            bezier
            yAxisSuffix="m"
            fromZero={false}
            segments={3}
            yAxisInterval={1}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>

        {/* Wind Speed Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>💨 Wind Speed (m/s)</Text>
          <LineChart
            data={{
              labels: forecastData.labels,
              datasets: [{
                data: forecastData.windSpeed || [10, 10, 10, 10, 10, 10, 10],
                color: (opacity = 1) => `rgba(52, 168, 83, ${opacity})`,
                strokeWidth: 3
              }]
            }}
            width={screenWidth}
            height={240}
            chartConfig={{
              ...commonChartConfig,
              backgroundColor: '#00c853',
              backgroundGradientFrom: '#64dd17',
              backgroundGradientTo: '#00c853',
              decimalPlaces: 2,
            }}
            style={styles.chart}
            bezier
            yAxisSuffix=" m/s"
            fromZero={false}
            segments={3}
            yAxisInterval={1}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>

        {/* Swell Period Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>⏱️ Swell Period (s)</Text>
          <LineChart
            data={{
              labels: forecastData.labels,
              datasets: [{
                data: forecastData.swellPeriod || [10, 10, 10, 10, 10, 10, 10],
                color: (opacity = 1) => `rgba(251, 140, 0, ${opacity})`,
                strokeWidth: 3
              }]
            }}
            width={screenWidth}
            height={240}
            chartConfig={{
              ...commonChartConfig,
              backgroundColor: '#ff6f00',
              backgroundGradientFrom: '#ff9100',
              backgroundGradientTo: '#ff6f00',
              decimalPlaces: 2,
            }}
            style={styles.chart}
            bezier
            yAxisSuffix="s"
            fromZero={false}
            segments={3}
            yAxisInterval={1}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>

        {/* Data Source Info */}
        {forecastData.metadata && (
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataText}>
              📊 AI-Powered Forecast • LSTM
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    margin: 10
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666'
  },
  errorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderRadius: 16,
    margin: 10
  },
  errorText: {
    fontSize: 14,
    color: '#856404'
  },
  chartSection: {
    marginVertical: 10
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 5,
    color: '#333'
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8
  },
  metadataContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 5
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  }
});

export default ForecastChart;