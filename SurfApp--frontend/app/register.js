import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../context/UserContext';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [minWaveHeight, setMinWaveHeight] = useState('0.5');
  const [maxWaveHeight, setMaxWaveHeight] = useState('2.0');
  const [tidePreference, setTidePreference] = useState('Any');
  const [boardType, setBoardType] = useState('Soft-top');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(UserContext);
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password, skillLevel, {
        minWaveHeight: parseFloat(minWaveHeight),
        maxWaveHeight: parseFloat(maxWaveHeight),
        tidePreference,
        boardType
      });
      router.replace('/');
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const SkillButton = ({ level }) => (
    <TouchableOpacity
      style={[styles.skillButton, skillLevel === level && styles.skillButtonActive]}
      onPress={() => setSkillLevel(level)}
    >
      <Text style={[styles.skillButtonText, skillLevel === level && styles.skillButtonTextActive]}>
        {level}
      </Text>
    </TouchableOpacity>
  );

  const OptionButton = ({ label, value, currentValue, onSelect }) => (
    <TouchableOpacity
      style={[styles.optionButton, currentValue === value && styles.optionButtonActive]}
      onPress={() => onSelect(value)}
    >
      <Text style={[styles.optionButtonText, currentValue === value && styles.optionButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the community</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="surfer@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Skill Level</Text>
            <View style={styles.skillContainer}>
              <SkillButton level="Beginner" />
              <SkillButton level="Intermediate" />
              <SkillButton level="Advanced" />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Preferred Wave Height (m)</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.subLabel}>Min</Text>
                <TextInput
                  style={styles.input}
                  value={minWaveHeight}
                  onChangeText={setMinWaveHeight}
                  keyboardType="numeric"
                  placeholder="0.5"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.subLabel}>Max</Text>
                <TextInput
                  style={styles.input}
                  value={maxWaveHeight}
                  onChangeText={setMaxWaveHeight}
                  keyboardType="numeric"
                  placeholder="2.0"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tide Preference</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {['Low', 'Mid', 'High', 'Any'].map(tide => (
                <OptionButton
                  key={tide}
                  label={tide}
                  value={tide}
                  currentValue={tidePreference}
                  onSelect={setTidePreference}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Board Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {['Soft-top', 'Longboard', 'Funboard', 'Shortboard'].map(board => (
                <OptionButton
                  key={board}
                  label={board}
                  value={board}
                  currentValue={boardType}
                  onSelect={setBoardType}
                />
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#0f172a',
  },
  skillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  skillButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  skillButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  skillButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
  },
  link: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  optionsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  optionButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
});

export default RegisterScreen;