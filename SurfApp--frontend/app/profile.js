import React, { useContext } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../context/UserContext';

const ProfileScreen = () => {
  const { userPreferences, setUserPreferences } = useContext(UserContext);

  const handleUpdate = (key, value) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }));
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

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#ffffff']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>⚙️ Surf Preferences</Text>
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
                  onPress={() => handleUpdate('skillLevel', level)}
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
                    handleUpdate('minWaveHeight', Number.isNaN(val) ? 0.5 : val);
                  }}
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
                    handleUpdate('maxWaveHeight', Number.isNaN(val) ? 2.5 : val);
                  }}
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
                  onPress={() => handleUpdate('tidePreference', tide)}
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
                  onPress={() => handleUpdate('boardType', board)}
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
});

export default ProfileScreen;