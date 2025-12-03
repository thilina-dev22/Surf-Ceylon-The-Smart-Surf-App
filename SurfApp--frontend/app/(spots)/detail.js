import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ForecastChart from '../../components/ForecastChart';
import ScoreBreakdown from '../../components/ScoreBreakdown';
import { startSession, endSession } from '../../data/surfApi';
import { useUser } from '../../context/UserContext';

const SpotDetailScreen = () => {
  const router = useRouter();
  const { origin } = useLocalSearchParams();
  const { userId, selectedSpot: contextSpot, activeSessionId, activeSessionSpot, setActiveSession, clearActiveSession } = useUser();
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionRating, setSessionRating] = useState(3);
  const [wouldReturn, setWouldReturn] = useState(true);
  const [sessionComments, setSessionComments] = useState('');

  // If coming from banner with active session, use activeSessionSpot
  const spot = (origin === 'banner' && activeSessionSpot) ? activeSessionSpot : contextSpot;

  if (!spot) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: 'Spot Details',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => {
                  if (origin === 'home') {
                    router.replace('/(spots)');
                  } else {
                    router.replace('/(spots)');
                  }
                }} 
                style={{ marginRight: 15 }}
              >
                <Ionicons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Spot details could not be loaded.</Text>
        </View>
      </>
    );
  }

  const forecast = spot.forecast || {};
  const tide = forecast.tide || {};
  
  // Use spot.score (number) for calculations, spot.suitability (string) for label
  const score = typeof spot.score === 'number' && !isNaN(spot.score) ? spot.score : 0;
  const suitabilityLabel = spot.suitability || 'Unknown';
  
  // Enhanced data from Phase 1
  const breakdown = spot.breakdown || {};
  const recommendations = spot.recommendations || [];
  const weights = spot.weights || {};
  const warnings = spot.warnings || [];

  const getGradientColors = () => {
    if (score >= 75) return ['#4ade80', '#22c55e'];
    if (score >= 50) return ['#fbbf24', '#f59e0b'];
    if (score >= 25) return ['#fb923c', '#f97316'];
    return ['#f87171', '#ef4444'];
  };

  const handleStartSession = async () => {
    if (!userId) {
      Alert.alert(
        'Login Required',
        'Please log in to track your surf sessions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    try {
      const conditions = {
        waveHeight: forecast.waveHeight,
        wavePeriod: forecast.wavePeriod,
        windSpeed: forecast.windSpeed,
        windDirection: forecast.windDirection,
        tide: tide.status,
        suitability: score
      };
      
      const session = await startSession(userId, spot.id, spot.name, conditions);
      if (session && session.sessionId) {
        setActiveSession(session.sessionId, spot);
        console.log('Session started successfully:', session.sessionId);
        // Alert only works when attached to an activity
        setTimeout(() => {
          Alert.alert('Session Started', 'Have a great surf! Tap "End Session" when you\'re done.');
        }, 100);
      }
    } catch (error) {
      console.error('Start session error:', error);
      // Silently fail if backend is unavailable - feature is optional
      console.warn('Session tracking unavailable. Please ensure backend server is running on port 3000.');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(activeSessionId, sessionRating, wouldReturn, sessionComments);
      clearActiveSession();
      setShowEndSessionModal(false);
      setSessionRating(3);
      setWouldReturn(true);
      setSessionComments('');
      console.log('Session ended successfully');
      // Alert only works when attached to an activity
      setTimeout(() => {
        Alert.alert('Session Ended', 'Thanks for the feedback! Your preferences will be updated.');
      }, 100);
    } catch (error) {
      console.error('End session error:', error);
      // Still close modal and reset state even if backend fails
      clearActiveSession();
      setShowEndSessionModal(false);
      setSessionRating(3);
      setWouldReturn(true);
      setSessionComments('');
      console.warn('Session tracking unavailable. Please ensure backend server is running on port 3000.');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: spot.name,
          headerStyle: { backgroundColor: '#0ea5e9' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (origin === 'home') {
                  router.replace('/(spots)');
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(spots)');
                }
              }} 
              style={{ marginRight: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView style={styles.container}>
        {/* Hero Section */}
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>{spot.name}</Text>
          <Text style={styles.heroRegion}>{spot.region}</Text>
          <View style={styles.heroScore}>
            <Text style={styles.heroScoreNumber}>{Math.round(score)}%</Text>
            <Text style={styles.heroScoreLabel}>{suitabilityLabel}</Text>
          </View>
        </LinearGradient>

        {/* Current Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌊 Current Conditions</Text>
          
          {!userId && (
            <View style={styles.guestNote}>
              <Text style={styles.guestNoteText}>
                ℹ️ Showing suitability for Beginner level. 
                <Text style={styles.guestNoteLink} onPress={() => router.push('/login')}> Log in</Text> to see your personalized score.
              </Text>
            </View>
          )}

          {/* Enhanced Score Breakdown - Phase 1 */}
          <ScoreBreakdown 
            breakdown={breakdown}
            recommendations={recommendations}
            weights={weights}
            warnings={warnings}
            canSurf={spot.canSurf}
          />
          
          <View style={styles.conditionsGrid}>
            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🌊</Text>
              <Text style={styles.conditionLabel}>Wave Height</Text>
              <Text style={styles.conditionValue}>{forecast.waveHeight}m</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>⏱️</Text>
              <Text style={styles.conditionLabel}>Wave Period</Text>
              <Text style={styles.conditionValue}>{forecast.wavePeriod}s</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>💨</Text>
              <Text style={styles.conditionLabel}>Wind Speed</Text>
              <Text style={styles.conditionValue}>{forecast.windSpeed} kph</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🧭</Text>
              <Text style={styles.conditionLabel}>Wind Direction</Text>
              <Text style={styles.conditionValue}>{forecast.windDirection}°</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>🌙</Text>
              <Text style={styles.conditionLabel}>Tide Status</Text>
              <Text style={styles.conditionValue}>{tide.status}</Text>
            </View>

            <View style={styles.conditionCard}>
              <Text style={styles.conditionIcon}>📊</Text>
              <Text style={styles.conditionLabel}>Score</Text>
              <Text style={styles.conditionValue}>{Math.round(score)}%</Text>
            </View>
          </View>
        </View>

        {/* Session Tracking - Phase 2 */}
        <View style={styles.section}>
          {!activeSessionId ? (
            <TouchableOpacity 
              style={styles.startSessionButton}
              onPress={handleStartSession}
            >
              <Text style={styles.startSessionIcon}>🏄‍♂️</Text>
              <Text style={styles.startSessionText}>Start Surf Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.endSessionButton}
              onPress={() => setShowEndSessionModal(true)}
            >
              <Text style={styles.endSessionIcon}>🛑</Text>
              <Text style={styles.endSessionText}>End Session & Rate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Forecast Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 7-Day Wave Forecast</Text>
          <View style={styles.chartContainer}>
            <ForecastChart spotId={spot.id} />
          </View>
        </View>

        {/* Tips Section */}
        <View style={[styles.section, styles.tipsSection]}>
          <Text style={styles.sectionTitle}>💡 Surf Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🏄‍♂️</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Best For</Text>
              <Text style={styles.tipText}>
                {score >= 75 ? 'All skill levels - Perfect conditions!' :
                 score >= 50 ? 'Intermediate to Advanced surfers' :
                 score >= 25 ? 'Experienced surfers only' :
                 'Challenging conditions - Exercise caution'}
              </Text>
            </View>
          </View>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>⏰</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Recommended Time</Text>
              <Text style={styles.tipText}>
                {tide.status === 'High' ? 'High tide - Good for beginners' :
                 tide.status === 'Low' ? 'Low tide - Watch for rocks' :
                 'Mid tide - Generally good conditions'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* End Session Modal */}
      <Modal
        visible={showEndSessionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEndSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Session</Text>
            
            <Text style={styles.modalLabel}>How was your session?</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    sessionRating === rating && styles.ratingButtonActive
                  ]}
                  onPress={() => setSessionRating(rating)}
                >
                  <Text style={[
                    styles.ratingText,
                    sessionRating === rating && styles.ratingTextActive
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Would you surf here again?</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, wouldReturn && styles.toggleButtonActive]}
                onPress={() => setWouldReturn(true)}
              >
                <Text style={[styles.toggleText, wouldReturn && styles.toggleTextActive]}>
                  Yes 👍
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !wouldReturn && styles.toggleButtonActive]}
                onPress={() => setWouldReturn(false)}
              >
                <Text style={[styles.toggleText, !wouldReturn && styles.toggleTextActive]}>
                  No 👎
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Comments (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="How were the waves? Any tips?"
              multiline
              numberOfLines={3}
              value={sessionComments}
              onChangeText={setSessionComments}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEndSessionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleEndSession}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    padding: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  heroRegion: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  heroScore: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroScoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  heroScoreLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  conditionCard: {
    width: '33.33%',
    padding: 6,
  },
  conditionCardInner: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  conditionLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsSection: {
    backgroundColor: '#f1f5f9',
    marginTop: 10,
  },
  tipCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
  // Session Tracking Styles
  startSessionButton: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startSessionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  startSessionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  endSessionButton: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  endSessionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  endSessionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonActive: {
    backgroundColor: '#0ea5e9',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
  },
  ratingTextActive: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#22c55e',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#fff',
  },
  commentInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    backgroundColor: '#0ea5e9',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  guestNote: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#64748b',
  },
  guestNoteText: {
    color: '#475569',
    fontSize: 14,
  },
  guestNoteLink: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
});

export default SpotDetailScreen;