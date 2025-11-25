import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { UserContext } from '../context/UserContext';
import { getUserSessions, getUserInsights } from '../data/surfApi';

const ProfileScreen = () => {
  const { userPreferences, setUserPreferences, updateUserPreferences, userId, user, logout } = useContext(UserContext);
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        if (!userId) return;
        try {
          setLoading(true);
          const [sessionsData, insightsData] = await Promise.all([
            getUserSessions(userId, 5),
            getUserInsights(userId)
          ]);
          setSessions(sessionsData.sessions || []);
          setInsights(insightsData);
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setLoading(false);
        }
      };

      if (userId) {
        loadUserData();
      }
    }, [userId])
  );

  const updateLocalPreference = (key, value) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreference = async (key, value) => {
    const newPreferences = { ...userPreferences, [key]: value };
    setUserPreferences(newPreferences);
    try {
      await updateUserPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save preference:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const OptionButton = ({ label, value, currentValue, onPress }) => {
    const isSelected = currentValue === value;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.optionButton,
          isSelected && styles.optionButtonSelected,
          pressed && styles.optionButtonPressed,
        ]}
        onPress={onPress}
      >
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
          {label}
        </Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  };

  if (!user) {
    return (
      <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.gradient}>
        <SafeAreaView style={[styles.container, styles.guestContainer]}>
          <View style={styles.guestContent}>
            <Text style={styles.guestTitle}>Welcome to Surf Ceylon</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to track your sessions, get personalized recommendations, and more.
            </Text>
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.registerButton} 
              onPress={() => router.push('/register')}
            >
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#ffffff']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile & Preferences</Text>
            {user && (
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            )}
            <Text style={styles.headerSubtitle}>
              Customize your profile to get personalized surf spot recommendations
            </Text>
          </View>

          {/* Skill Level */}
          <View style={styles.preferenceSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏄‍♂️</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Skill Level</Text>
                <Text style={styles.sectionSubtitle}>Your surfing experience</Text>
              </View>
            </View>
            <View style={styles.optionsContainer}>
              {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                <OptionButton
                  key={level}
                  label={level}
                  value={level}
                  currentValue={userPreferences.skillLevel}
                  onPress={() => savePreference('skillLevel', level)}
                />
              ))}
            </View>
          </View>

          {/* Wave Height */}
          <View style={styles.preferenceSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🌊</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Preferred Wave Height</Text>
                <Text style={styles.sectionSubtitle}>In meters</Text>
              </View>
            </View>
            <View style={styles.rangeContainer}>
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Min</Text>
                <TextInput
                  style={styles.input}
                  value={String(userPreferences.minWaveHeight)}
                  onChangeText={text => {
                    const val = parseFloat(text);
                    updateLocalPreference('minWaveHeight', Number.isNaN(val) ? 0.5 : val);
                  }}
                  onEndEditing={() => updateUserPreferences(userPreferences)}
                  keyboardType="decimal-pad"
                  placeholder="0.5"
                />
                <Text style={styles.rangeUnit}>m</Text>
              </View>
              
              <Text style={styles.rangeSeparator}>to</Text>
              
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Max</Text>
                <TextInput
                  style={styles.input}
                  value={String(userPreferences.maxWaveHeight)}
                  onChangeText={text => {
                    const val = parseFloat(text);
                    updateLocalPreference('maxWaveHeight', Number.isNaN(val) ? 2.5 : val);
                  }}
                  onEndEditing={() => updateUserPreferences(userPreferences)}
                  keyboardType="decimal-pad"
                  placeholder="2.5"
                />
                <Text style={styles.rangeUnit}>m</Text>
              </View>
            </View>
          </View>

          {/* Tide Preference */}
          <View style={styles.preferenceSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🌙</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Preferred Tide</Text>
                <Text style={styles.sectionSubtitle}>Best tide for your style</Text>
              </View>
            </View>
            <View style={styles.optionsContainer}>
              {['Any', 'High', 'Mid', 'Low'].map(tide => (
                <OptionButton
                  key={tide}
                  label={tide}
                  value={tide}
                  currentValue={userPreferences.tidePreference}
                  onPress={() => savePreference('tidePreference', tide)}
                />
              ))}
            </View>
          </View>

          {/* Board Type */}
          <View style={styles.preferenceSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏄</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Board Type</Text>
                <Text style={styles.sectionSubtitle}>Your current setup</Text>
              </View>
            </View>
            <View style={styles.optionsContainer}>
              {['Shortboard', 'Longboard', 'Soft-top'].map(board => (
                <OptionButton
                  key={board}
                  label={board}
                  value={board}
                  currentValue={userPreferences.boardType}
                  onPress={() => savePreference('boardType', board)}
                />
              ))}
            </View>
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Profile Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Skill:</Text>
              <Text style={styles.summaryValue}>{userPreferences.skillLevel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Waves:</Text>
              <Text style={styles.summaryValue}>
                {userPreferences.minWaveHeight}m - {userPreferences.maxWaveHeight}m
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tide:</Text>
              <Text style={styles.summaryValue}>{userPreferences.tidePreference}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Board:</Text>
              <Text style={styles.summaryValue}>{userPreferences.boardType}</Text>
            </View>
          </View>

          {/* User Insights - Phase 3 */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Loading your surf stats...</Text>
            </View>
          ) : insights ? (
            <>
              {/* Insights Summary */}
              <View style={styles.preferenceSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📊</Text>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Your Surf Stats</Text>
                    <Text style={styles.sectionSubtitle}>Based on your sessions</Text>
                  </View>
                </View>
                <View style={styles.insightsCard}>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Total Sessions:</Text>
                    <Text style={styles.insightValue}>{insights.totalSessions || 0}</Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Average Rating:</Text>
                    <Text style={styles.insightValue}>
                      {insights.avgRating ? `${insights.avgRating} ⭐` : 'N/A'}
                    </Text>
                  </View>
                  {insights.favoriteSpots && insights.favoriteSpots.length > 0 && (
                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>Favorite Spot:</Text>
                      <Text style={styles.insightValue}>{insights.favoriteSpots[0].spotName}</Text>
                    </View>
                  )}
                  {insights.preferredConditions && (
                    <>
                      <View style={styles.insightRow}>
                        <Text style={styles.insightLabel}>Preferred Wave Height:</Text>
                        <Text style={styles.insightValue}>
                          {insights.preferredConditions.preferredWaveHeight ? `${parseFloat(insights.preferredConditions.preferredWaveHeight).toFixed(1)}m` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.insightRow}>
                        <Text style={styles.insightLabel}>Preferred Wind Speed:</Text>
                        <Text style={styles.insightValue}>
                          {insights.preferredConditions.preferredWindSpeed ? `${parseFloat(insights.preferredConditions.preferredWindSpeed).toFixed(0)} kph` : 'N/A'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Recent Sessions */}
              {sessions.length > 0 && (
                <View style={styles.preferenceSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>🏄</Text>
                    <View style={styles.sectionHeaderText}>
                      <Text style={styles.sectionTitle}>Recent Sessions</Text>
                      <Text style={styles.sectionSubtitle}>Your last {sessions.length} surfs</Text>
                    </View>
                  </View>
                  {sessions.map((session, index) => (
                    <View key={session._id || index} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <Text style={styles.sessionSpot}>{session.spotName}</Text>
                        <Text style={styles.sessionRating}>
                          {session.rating} ⭐
                        </Text>
                      </View>
                      <Text style={styles.sessionDate}>
                        {new Date(session.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      {session.comments && (
                        <Text style={styles.sessionComments}>{session.comments}</Text>
                      )}
                      <View style={styles.sessionConditions}>
                        <Text style={styles.sessionConditionText}>
                          🌊 {session.conditions?.waveHeight}m
                        </Text>
                        <Text style={styles.sessionConditionText}>
                          💨 {session.conditions?.windSpeed} kph
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  header: {
    padding: 24,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  preferenceSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    margin: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionButtonSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  optionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: 'white',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0f172a',
  },
  rangeUnit: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  rangeSeparator: {
    fontSize: 16,
    color: '#64748b',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  // Insights and Sessions Styles
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  insightLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionSpot: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sessionRating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  sessionDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  sessionComments: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  sessionConditions: {
    flexDirection: 'row',
    gap: 16,
  },
  sessionConditionText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  logoutContainer: {
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  guestContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestContent: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  registerButtonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;