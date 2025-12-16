// Multi-Output 7-Day Surf Forecast Component
// Displays: Wave Height, Wind Speed, and Swell Period charts
import React, { useState, useEffect } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions, ActivityIndicator, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { get7DayForecast } from '../data/surfApi';

const ForecastChart = ({ spotId = '2' }) => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'hourly'
  const [selectedDay, setSelectedDay] = useState(0); // 0-6 for hourly view
  const screenWidth = Dimensions.get('window').width - 40;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await get7DayForecast(spotId, viewMode);
        setForecastData(data);
      } catch (e) {
        console.error("Failed to load forecast data:", e);
        // Generate dynamic labels starting from today
        const generateLabels = () => {
          const labels = [];
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const today = new Date();
          
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = dayNames[date.getDay()];
            
            if (i === 0) {
              labels.push('Today');
            } else if (i === 1) {
              labels.push('Tmrw');
            } else {
              labels.push(dayName);
            }
          }
          return labels;
        };
        
        // Set fallback mock data
        setForecastData({
          labels: generateLabels(),
          waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
          windSpeed: [15, 14, 16, 13, 15, 14, 15],
          swellPeriod: [12, 13, 12, 14, 13, 12, 12],
          viewMode: 'daily'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [spotId, viewMode]);
  
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

  // Prepare chart data based on view mode
  const getChartData = () => {
    if (viewMode === 'hourly' && forecastData.hourlyByDay) {
      // For hourly view, show only selected day's 24 hours
      const dayData = forecastData.hourlyByDay[selectedDay] || [];
      
      // Generate time labels (00:00, 03:00, 06:00, etc.)
      const labels = dayData.map(h => {
        const hour = h.hourOfDay;
        if (hour % 3 === 0) {
          return `${hour.toString().padStart(2, '0')}:00`;
        }
        return '';
      });
      
      return {
        labels,
        waveHeight: dayData.map(h => h.waveHeight),
        windSpeed: dayData.map(h => h.windSpeed),
        swellPeriod: dayData.map(h => h.swellPeriod),
        dayData // Store for reference
      };
    } else {
      // Daily view - use default labels only if forecastData.labels is missing
      // (should rarely happen as API/fallback should provide labels)
      return {
        labels: forecastData.labels || (() => {
          const labels = [];
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const today = new Date();
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = dayNames[date.getDay()];
            if (i === 0) labels.push('Today');
            else if (i === 1) labels.push('Tmrw');
            else labels.push(dayName);
          }
          return labels;
        })(),
        waveHeight: forecastData.waveHeight || [1, 1, 1, 1, 1, 1, 1],
        windSpeed: forecastData.windSpeed || [10, 10, 10, 10, 10, 10, 10],
        swellPeriod: forecastData.swellPeriod || [10, 10, 10, 10, 10, 10, 10]
      };
    }
  };

  const chartData = getChartData();
  // For hourly view, make chart 2.5x wider to fit all 24 hours with scrolling
  const baseWidth = Dimensions.get('window').width - 60;
  const chartWidth = viewMode === 'hourly' ? baseWidth * 2.5 : baseWidth;

  const commonChartConfig = {
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.95})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#ffffff'
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: 'rgba(255, 255, 255, 0.25)'
    },
    fillShadowGradientOpacity: 0.3,
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600'
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'daily' && styles.toggleButtonActive]}
          onPress={() => setViewMode('daily')}
        >
          <Text style={[styles.toggleText, viewMode === 'daily' && styles.toggleTextActive]}>
            📅 Daily Average
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'hourly' && styles.toggleButtonActive]}
          onPress={() => {
            setViewMode('hourly');
            setSelectedDay(0);
          }}
        >
          <Text style={[styles.toggleText, viewMode === 'hourly' && styles.toggleTextActive]}>
            ⏰ Hourly Forecast
          </Text>
        </Pressable>
      </View>

      {/* Day Selector for Hourly View */}
      {viewMode === 'hourly' && forecastData?.labels && (
        <View style={styles.daySelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {forecastData.labels.map((label, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.dayButton,
                  selectedDay === idx && styles.dayButtonActive
                ]}
                onPress={() => setSelectedDay(idx)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === idx && styles.dayButtonTextActive
                ]}>
                  {label}
                </Text>
                <Text style={[
                  styles.dayButtonSubtext,
                  selectedDay === idx && styles.dayButtonSubtextActive
                ]}>
                  Day {idx + 1}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.container}>
        {/* Wave Height Chart */}
        <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>🌊 Wave Height (m)</Text>
            <ScrollView 
              horizontal={viewMode === 'hourly'} 
              showsHorizontalScrollIndicator={viewMode === 'hourly'}
              style={styles.chartScrollView}
            >
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.waveHeight,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  strokeWidth: 3
                }]
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...commonChartConfig,
                backgroundColor: '#1e88e5',
                backgroundGradientFrom: '#2196f3',
                backgroundGradientTo: '#1565c0',
              }}
              style={styles.chart}
              bezier
              withShadow={false}
              withInnerLines={true}
              withOuterLines={true}
              yAxisSuffix="m"
              fromZero={true}
            />
            </ScrollView>
          </View>

          {/* Wind Speed Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>💨 Wind Speed (m/s)</Text>
            <ScrollView 
              horizontal={viewMode === 'hourly'} 
              showsHorizontalScrollIndicator={viewMode === 'hourly'}
              style={styles.chartScrollView}
            >
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.windSpeed,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  strokeWidth: 3
                }]
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...commonChartConfig,
                backgroundColor: '#43a047',
                backgroundGradientFrom: '#66bb6a',
                backgroundGradientTo: '#2e7d32',
              }}
              style={styles.chart}
              bezier
              withShadow={false}
              withInnerLines={true}
              withOuterLines={true}
              yAxisSuffix=" m/s"
              fromZero={true}
            />
            </ScrollView>
          </View>

          {/* Swell Period Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>⏱️ Swell Period (s)</Text>
            <ScrollView 
              horizontal={viewMode === 'hourly'} 
              showsHorizontalScrollIndicator={viewMode === 'hourly'}
              style={styles.chartScrollView}
            >
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.swellPeriod,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  strokeWidth: 3
                }]
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...commonChartConfig,
                backgroundColor: '#fb8c00',
                backgroundGradientFrom: '#ffa726',
                backgroundGradientTo: '#ef6c00',
              }}
              style={styles.chart}
              bezier
              withShadow={false}
              withInnerLines={true}
              withOuterLines={true}
              yAxisSuffix="s"
              fromZero={true}
            />
            </ScrollView>
          </View>

          {/* Data Source Info */}
          {forecastData.metadata && (
            <View style={styles.metadataContainer}>
              <Text style={styles.metadataText}>
                📊 {forecastData.metadata.dataSource === 'Mock' ? 'Demo Forecast' : 'AI-Powered Forecast'}
                {forecastData.metadata.forecastMethod && ` • ${forecastData.metadata.forecastMethod}`}
              </Text>
              {viewMode === 'hourly' && (
                <Text style={styles.metadataText}>
                  🕐 Showing 24-hour forecast for {forecastData.labels[selectedDay]}
                </Text>
              )}
            </View>
          )}

          {/* Hourly Time Guide */}
          {viewMode === 'hourly' && (
            <View style={styles.timeGuideContainer}>
              <View style={styles.timeGuideRow}>
                <Text style={styles.timeGuideLabel}>🌅 Dawn</Text>
                <Text style={styles.timeGuideTime}>06:00</Text>
              </View>
              <View style={styles.timeGuideRow}>
                <Text style={styles.timeGuideLabel}>☀️ Midday</Text>
                <Text style={styles.timeGuideTime}>12:00</Text>
              </View>
              <View style={styles.timeGuideRow}>
                <Text style={styles.timeGuideLabel}>🌇 Dusk</Text>
                <Text style={styles.timeGuideTime}>18:00</Text>
              </View>
              <View style={styles.timeGuideRow}>
                <Text style={styles.timeGuideLabel}>🌙 Night</Text>
                <Text style={styles.timeGuideTime}>00:00</Text>
              </View>
            </View>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingVertical: 10
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 10,
    marginBottom: 15
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  toggleTextActive: {
    color: '#1a73e8',
    fontWeight: '700'
  },
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
    marginVertical: 10,
    alignItems: 'center'
  },paddingHorizontal: 20,
    
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 5,
    color: '#1a1a1a',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5
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
    textAlign: 'center',
    marginVertical: 2
  },
  daySelectorContainer: {
    marginHorizontal: 10,
    marginBottom: 15
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  dayButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1a73e8',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666'
  },
  dayButtonTextActive: {
    color: '#1a73e8',
    fontSize: 15
  },
  dayButtonSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  dayButtonSubtextActive: {
    color: '#1a73e8',
    fontWeight: '600'
  },
  timeGuideContainer: {
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap'
  },
  timeGuideRow: {
    alignItems: 'center',
    marginVertical: 5
  },
  timeGuideLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2
  },
  timeGuideTime: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600'
  },
  chartScrollView: {
    flex: 1
  }
});

export default ForecastChart;