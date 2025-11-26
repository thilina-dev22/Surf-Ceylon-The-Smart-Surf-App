import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { UserContext } from '../context/UserContext';
import { getUserSessions, getUserInsights } from '../data/surfApi';

const ProfileScreen = () => {
  const { 
    userPreferences, 
    setUserPreferences, 
    updateUserPreferences, 
    userId, 
    user, 
    logout,
    updateProfile,
    changePassword,
    deleteAccount
  } = useContext(UserContext);
  
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [activeModal, setActiveModal] = useState(null);
  
  // Form States
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [tempPreferences, setTempPreferences] = useState({});

  // All Sessions Modal State
  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('newest');
  
  // Session Details Modal State
  const [selectedSession, setSelectedSession] = useState(null);

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
        setProfileForm({ name: user?.name || '', email: user?.email || '' });
        setTempPreferences(userPreferences);
      }
    }, [userId, user, userPreferences])
  );

  const fetchAllSessions = async () => {
    if (!userId) return;
    try {
      setSessionsLoading(true);
      const data = await getUserSessions(userId, 100);
      setAllSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading all sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const getFilteredSessions = () => {
    let filtered = [...allSessions];
    
    switch (sessionFilter) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        break;
      case 'highest_rated':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        break;
    }
    
    return filtered;
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.name || !profileForm.email) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      await updateProfile(profileForm.name, profileForm.email);
      Alert.alert('Success', 'Profile updated successfully');
      setActiveModal(null);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordForm.new.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      Alert.alert('Success', 'Password changed successfully');
      setActiveModal(null);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSavePreferences = async () => {
    try {
      const prefsToSave = {
        ...tempPreferences,
        minWaveHeight: parseFloat(tempPreferences.minWaveHeight),
        maxWaveHeight: parseFloat(tempPreferences.maxWaveHeight)
      };

      if (isNaN(prefsToSave.minWaveHeight) || isNaN(prefsToSave.maxWaveHeight)) {
        Alert.alert('Error', 'Please enter valid numbers for wave height');
        return;
      }

      await updateUserPreferences(prefsToSave);
      setUserPreferences(prefsToSave);
      setActiveModal(null);
      Alert.alert('Success', 'Preferences updated');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save preferences');
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

  const OptionButton = ({ label, value, currentValue, onSelect }) => {
    const isSelected = currentValue === value;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.optionButton,
          isSelected && styles.optionButtonSelected,
          pressed && styles.optionButtonPressed,
        ]}
        onPress={() => onSelect(value)}
      >
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
          {label}
        </Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  };

  const SessionCard = ({ session, onPress }) => (
    <TouchableOpacity onPress={() => onPress(session)} style={styles.sessionCard} activeOpacity={0.7}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionSpot}>{session.spotName}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{session.rating}</Text>
          <Text style={styles.starIcon}>⭐</Text>
        </View>
      </View>
      <View style={styles.sessionMetaRow}>
        <Text style={styles.sessionDate}>
          {new Date(session.startTime).toLocaleDateString()}
        </Text>
        <Text style={styles.sessionDuration}>
          {session.duration} min
        </Text>
      </View>
      {session.comments && (
        <Text style={styles.sessionComments} numberOfLines={2}>
          "{session.comments}"
        </Text>
      )}
      <View style={styles.sessionConditions}>
        <View style={styles.conditionItem}>
          <Text style={styles.conditionIcon}>🌊</Text>
          <Text style={styles.conditionText}>{session.conditions?.waveHeight || session.waveHeight}m</Text>
        </View>
        <View style={styles.conditionItem}>
          <Text style={styles.conditionIcon}>💨</Text>
          <Text style={styles.conditionText}>{session.conditions?.windSpeed || session.windSpeed}kph</Text>
        </View>
      </View>
      <Text style={styles.tapToView}>Tap to view details</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.gradient}>
        <SafeAreaView style={[styles.container, styles.guestContainer]}>
          <View style={styles.guestContent}>
            <Text style={styles.guestTitle}>Welcome to Surf Ceylon</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to track your sessions, get personalized recommendations, and more.
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header & Profile Summary */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveModal('profile')}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={() => setActiveModal('password')}>
                  <Text style={styles.actionButtonText}>Change Password</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteAccount}>
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Preferences Summary Card */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Surfing Preferences</Text>
              <TouchableOpacity onPress={() => {
                setTempPreferences(userPreferences);
                setActiveModal('preferences');
              }}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Skill Level</Text>
                <Text style={styles.summaryValue}>{userPreferences.skillLevel}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Wave Height</Text>
                <Text style={styles.summaryValue}>
                  {userPreferences.minWaveHeight}m - {userPreferences.maxWaveHeight}m
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Preferred Tide</Text>
                <Text style={styles.summaryValue}>{userPreferences.tidePreference}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Board Type</Text>
                <Text style={styles.summaryValue}>{userPreferences.boardType}</Text>
              </View>
            </View>
          </View>

          {/* User Insights */}
          {loading ? (
            <ActivityIndicator size="large" color="#0ea5e9" style={{ margin: 20 }} />
          ) : insights ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Stats</Text>
              <View style={styles.insightsCard}>
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Total Sessions</Text>
                  <Text style={styles.insightValue}>{insights.totalSessions || 0}</Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Avg Rating</Text>
                  <Text style={styles.insightValue}>
                    {insights.avgRating ? `${insights.avgRating} ⭐` : 'N/A'}
                  </Text>
                </View>
                {insights.favoriteSpots && insights.favoriteSpots.length > 0 && (
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Favorite Spot</Text>
                    <Text style={styles.insightValue}>{insights.favoriteSpots[0].spotName}</Text>
                  </View>
                )}
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Avg Duration</Text>
                  <Text style={styles.insightValue}>
                    {insights.avgSessionDuration ? `${insights.avgSessionDuration} min` : 'N/A'}
                  </Text>
                </View>
                {insights.bestTimesOfDay && insights.bestTimesOfDay.length > 0 && (
                  <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Best Time</Text>
                    <Text style={styles.insightValue}>{insights.bestTimesOfDay[0].timeRange}</Text>
                  </View>
                )}
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Preferred Wave Height</Text>
                  <Text style={styles.insightValue}>
                    {insights.preferredConditions?.preferredWaveHeight 
                      ? `${parseFloat(insights.preferredConditions.preferredWaveHeight).toFixed(1)}m` 
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Preferred Wind Speed</Text>
                  <Text style={styles.insightValue}>
                    {insights.preferredConditions?.preferredWindSpeed 
                      ? `${parseFloat(insights.preferredConditions.preferredWindSpeed).toFixed(0)} kph` 
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Recent Sessions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              <TouchableOpacity onPress={() => {
                fetchAllSessions();
                setActiveModal('sessions');
              }}>
                <Text style={styles.editLink}>View All</Text>
              </TouchableOpacity>
            </View>

            {sessions.map((session) => (
              <SessionCard key={session._id} session={session} onPress={setSelectedSession} />
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Session Details Modal */}
        <Modal
          visible={selectedSession !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedSession(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.detailsModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Session Details</Text>
                <TouchableOpacity onPress={() => setSelectedSession(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedSession && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Spot</Text>
                    <Text style={styles.detailValue}>{selectedSession.spotName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedSession.startTime).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedSession.startTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {new Date(selectedSession.endTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedSession.duration} minutes</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Rating</Text>
                    <Text style={styles.detailValue}>{selectedSession.rating} ⭐</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wave Height</Text>
                    <Text style={styles.detailValue}>
                      {selectedSession.conditions?.waveHeight || selectedSession.waveHeight}m
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wind Speed</Text>
                    <Text style={styles.detailValue}>
                      {selectedSession.conditions?.windSpeed || selectedSession.windSpeed} kph
                    </Text>
                  </View>

                  {selectedSession.comments && (
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailLabel}>Comments</Text>
                      <Text style={styles.detailComments}>{selectedSession.comments}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={activeModal === 'profile'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={profileForm.name}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, name: text }))}
              />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={profileForm.email}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={activeModal === 'password'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={passwordForm.current}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, current: text }))}
                secureTextEntry
              />
              
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={passwordForm.new}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, new: text }))}
                secureTextEntry
              />
              
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={passwordForm.confirm}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirm: text }))}
                secureTextEntry
              />
              
              <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
                <Text style={styles.saveButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Preferences Modal */}
        <Modal
          visible={activeModal === 'preferences'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalContainer}
          >
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Preferences</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.prefSectionTitle}>Skill Level</Text>
                <View style={styles.optionsContainer}>
                  {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                    <OptionButton
                      key={level}
                      label={level}
                      value={level}
                      currentValue={tempPreferences.skillLevel}
                      onSelect={(val) => setTempPreferences(prev => ({ ...prev, skillLevel: val }))}
                    />
                  ))}
                </View>

                <Text style={styles.prefSectionTitle}>Wave Height (m)</Text>
                <View style={styles.rangeContainer}>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Min</Text>
                    <TextInput
                      style={styles.input}
                      value={String(tempPreferences.minWaveHeight)}
                      onChangeText={text => {
                        setTempPreferences(prev => ({ ...prev, minWaveHeight: text }));
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text style={styles.rangeSeparator}>to</Text>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Max</Text>
                    <TextInput
                      style={styles.input}
                      value={String(tempPreferences.maxWaveHeight)}
                      onChangeText={text => {
                        setTempPreferences(prev => ({ ...prev, maxWaveHeight: text }));
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Text style={styles.prefSectionTitle}>Preferred Tide</Text>
                <View style={styles.optionsContainer}>
                  {['Any', 'High', 'Mid', 'Low'].map(tide => (
                    <OptionButton
                      key={tide}
                      label={tide}
                      value={tide}
                      currentValue={tempPreferences.tidePreference}
                      onSelect={(val) => setTempPreferences(prev => ({ ...prev, tidePreference: val }))}
                    />
                  ))}
                </View>

                <Text style={styles.prefSectionTitle}>Board Type</Text>
                <View style={styles.optionsContainer}>
                  {['Shortboard', 'Longboard', 'Soft-top'].map(board => (
                    <OptionButton
                      key={board}
                      label={board}
                      value={board}
                      currentValue={tempPreferences.boardType}
                      onSelect={(val) => setTempPreferences(prev => ({ ...prev, boardType: val }))}
                    />
                  ))}
                </View>
              </ScrollView>
              
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePreferences}>
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* All Sessions Modal */}
        <Modal
          visible={activeModal === 'sessions'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setActiveModal(null)}
        >
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalHeaderTitle}>All Sessions</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButtonContainer}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity 
                  style={[styles.filterChip, sessionFilter === 'newest' && styles.filterChipActive]}
                  onPress={() => setSessionFilter('newest')}
                >
                  <Text style={[styles.filterChipText, sessionFilter === 'newest' && styles.filterChipTextActive]}>Newest First</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sessionFilter === 'oldest' && styles.filterChipActive]}
                  onPress={() => setSessionFilter('oldest')}
                >
                  <Text style={[styles.filterChipText, sessionFilter === 'oldest' && styles.filterChipTextActive]}>Oldest First</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sessionFilter === 'highest_rated' && styles.filterChipActive]}
                  onPress={() => setSessionFilter('highest_rated')}
                >
                  <Text style={[styles.filterChipText, sessionFilter === 'highest_rated' && styles.filterChipTextActive]}>Highest Rated</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {sessionsLoading ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={getFilteredSessions()}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.sessionsListContent}
                renderItem={({ item }) => (
                  <SessionCard session={item} onPress={setSelectedSession} />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No sessions found</Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  
  // Guest View
  guestContainer: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  guestContent: { alignItems: 'center', width: '100%' },
  guestTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  guestSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  loginButton: {
    backgroundColor: '#0ea5e9', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, width: '100%', alignItems: 'center',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginBottom: 16,
  },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Header
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  profileCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 20,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#0ea5e9',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#64748b' },
  editLink: { color: '#0ea5e9', fontSize: 14, fontWeight: '600', marginTop: 4 },
  
  actionButtons: { gap: 12 },
  actionButton: {
    backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  actionButtonText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  deleteButtonText: { color: '#ef4444' },

  // Sections
  sectionContainer: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  summaryCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabel: { fontSize: 16, color: '#64748b' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },

  insightsCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  insightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  insightLabel: { fontSize: 16, color: '#64748b' },
  insightValue: { fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' },

  // Modals
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  detailsModalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  closeButton: { fontSize: 24, color: '#94a3b8', padding: 4 },
  
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 16 },
  modalInput: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#0ea5e9', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Session Details Modal
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  detailRowFull: {
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  detailLabel: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  detailValue: { fontSize: 16, color: '#0f172a', textAlign: 'right', flex: 1, marginLeft: 16 },
  detailComments: { fontSize: 16, color: '#0f172a', marginTop: 8, fontStyle: 'italic' },

  // Preferences
  prefSectionTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 24, marginBottom: 12 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, margin: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  optionButtonSelected: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  optionButtonPressed: { opacity: 0.7 },
  optionText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  optionTextSelected: { color: 'white' },
  checkmark: { color: 'white', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  
  rangeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeInput: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  rangeLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  input: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  rangeSeparator: { marginHorizontal: 12, color: '#94a3b8', fontWeight: '600' },

  // Logout Button
  logoutButton: {
    backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    marginHorizontal: 20, marginTop: 32,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  logoutButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Session Card Styles
  sessionCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sessionSpot: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#fcd34d',
  },
  ratingText: { fontSize: 13, fontWeight: 'bold', color: '#b45309', marginRight: 4 },
  starIcon: { fontSize: 10 },
  sessionMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionDate: { fontSize: 13, color: '#64748b' },
  sessionDuration: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  sessionConditions: { flexDirection: 'row', gap: 12 },
  conditionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  conditionIcon: { fontSize: 12, marginRight: 6 },
  conditionText: { fontSize: 12, fontWeight: '600', color: '#0369a1' },
  sessionComments: { fontSize: 14, color: '#334155', fontStyle: 'italic', marginTop: 12, marginBottom: 4 },
  tapToView: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 },

  // Full Screen Modal Styles
  fullScreenModal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeaderBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  closeButtonContainer: { padding: 4 },
  closeButtonText: { fontSize: 16, color: '#0ea5e9', fontWeight: '600' },
  filterContainer: { backgroundColor: 'white', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  filterChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: 'white' },
  sessionsListContent: { padding: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748b' },
});

export default ProfileScreen;