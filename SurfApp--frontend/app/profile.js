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
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'password', 'preferences', null
  
  // Form States
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [tempPreferences, setTempPreferences] = useState({});

  // All Sessions Modal State
  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('newest'); // 'newest', 'oldest', 'highest_rated'

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
      const data = await getUserSessions(userId, 100); // Fetch up to 100 sessions
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
      await updateUserPreferences(tempPreferences);
      setUserPreferences(tempPreferences);
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
            <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/register')}>
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe', '#ffffff']} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
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
                {/* Always show preferred conditions if available, or N/A */}
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
          {sessions.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Sessions</Text>
                <TouchableOpacity onPress={() => {
                  setActiveModal('sessions');
                  fetchAllSessions();
                }}>
                  <Text style={styles.editLink}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {sessions.slice(0, 3).map((session, index) => (
                <View key={session._id || index} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionSpot}>{session.spotName}</Text>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>{session.rating}</Text>
                      <Text style={styles.starIcon}>⭐</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.sessionDate}>
                    {new Date(session.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  
                  <View style={styles.sessionConditions}>
                    <View style={styles.conditionItem}>
                      <Text style={styles.conditionIcon}>🌊</Text>
                      <Text style={styles.conditionText}>
                        {session.conditions?.waveHeight ? `${session.conditions.waveHeight}m` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.conditionItem}>
                      <Text style={styles.conditionIcon}>💨</Text>
                      <Text style={styles.conditionText}>
                        {session.conditions?.windSpeed ? `${session.conditions.windSpeed} kph` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Logout */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

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
          <View style={styles.modalContainer}>
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
                      value={String(tempPreferences.minWaveHeight || 0.5)}
                      onChangeText={text => {
                        const val = parseFloat(text);
                        setTempPreferences(prev => ({ ...prev, minWaveHeight: Number.isNaN(val) ? 0.5 : val }));
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text style={styles.rangeSeparator}>to</Text>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Max</Text>
                    <TextInput
                      style={styles.input}
                      value={String(tempPreferences.maxWaveHeight || 2.0)}
                      onChangeText={text => {
                        const val = parseFloat(text);
                        setTempPreferences(prev => ({ ...prev, maxWaveHeight: Number.isNaN(val) ? 2.0 : val }));
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
          </View>
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
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0ea5e9" />
              </View>
            ) : (
              <FlatList
                data={getFilteredSessions()}
                keyExtractor={(item, index) => item._id || index.toString()}
                contentContainerStyle={styles.sessionsListContent}
                renderItem={({ item }) => (
                  <View style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionSpot}>{item.spotName}</Text>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{item.rating}</Text>
                        <Text style={styles.starIcon}>⭐</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.sessionDate}>
                      {new Date(item.startTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    
                    {item.comments && (
                      <Text style={styles.sessionComments}>{item.comments}</Text>
                    )}

                    <View style={styles.sessionConditions}>
                      <View style={styles.conditionItem}>
                        <Text style={styles.conditionIcon}>🌊</Text>
                        <Text style={styles.conditionText}>
                          {item.conditions?.waveHeight ? `${item.conditions.waveHeight}m` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.conditionItem}>
                        <Text style={styles.conditionIcon}>💨</Text>
                        <Text style={styles.conditionText}>
                          {item.conditions?.windSpeed ? `${item.conditions.windSpeed} kph` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No sessions found.</Text>
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
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#0ea5e9',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  userEmail: { fontSize: 14, color: '#64748b' },
  editLink: { color: '#0ea5e9', fontWeight: '600', fontSize: 15 },
  
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center'
  },
  actionButtonText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  deleteButton: { backgroundColor: '#fee2e2' },
  deleteButtonText: { color: '#ef4444' },

  sectionContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  summaryCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  summaryLabel: { fontSize: 15, color: '#64748b' },
  summaryValue: { fontSize: 15, color: '#0f172a', fontWeight: '600' },

  insightsCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  insightRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  insightLabel: { fontSize: 15, color: '#64748b' },
  insightValue: { fontSize: 15, color: '#0f172a', fontWeight: 'bold' },

  logoutContainer: { padding: 20 },
  logoutButton: {
    backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  logoutText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Modal Styles
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeButton: { fontSize: 24, color: '#64748b', padding: 4 },
  
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a', marginBottom: 20
  },
  saveButton: {
    backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10
  },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Preference Edit Styles
  prefSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 16, marginBottom: 12 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
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
  rangeLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  input: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  rangeSeparator: { marginHorizontal: 12, color: '#64748b', fontWeight: '500' },

  // Guest Styles
  guestContainer: { justifyContent: 'center', alignItems: 'center' },
  guestContent: { padding: 30, alignItems: 'center', width: '100%' },
  guestTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  guestSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  loginButton: {
    backgroundColor: '#0ea5e9', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 16,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  registerButton: {
    backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0',
  },
  registerButtonText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },

  // Session Card Styles
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionSpot: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b45309',
    marginRight: 4,
  },
  starIcon: {
    fontSize: 10,
  },
  sessionDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  sessionConditions: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },

  // Full Screen Modal Styles
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButtonContainer: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: 'white',
  },
  sessionsListContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default ProfileScreen;