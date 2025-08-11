
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';

const BiometricSetupScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [biometricType, setBiometricType] = useState<string>('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleBiometricSetup = async (type: 'fingerprint' | 'face') => {
    setIsSettingUp(true);
    try {
      // Simulate biometric setup
      setTimeout(() => {
        setBiometricType(type === 'fingerprint' ? 'Fingerprint' : 'Face ID');
        Alert.alert(
          'Setup Complete!',
          `${type === 'fingerprint' ? 'Fingerprint' : 'Face ID'} authentication has been successfully enabled for your account.`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
        setIsSettingUp(false);
      }, 2000);
    } catch (error) {
      Alert.alert('Setup Failed', 'Unable to setup biometric authentication');
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric Setup</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Secure Your Account</Text>
        <Text style={styles.subtitle}>
          Choose a biometric method to secure your account
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleBiometricSetup('fingerprint')}
            disabled={isSettingUp}
          >
            <Text style={styles.optionIcon}>👆</Text>
            <Text style={styles.optionTitle}>Fingerprint</Text>
            <Text style={styles.optionDescription}>
              Use your fingerprint to unlock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleBiometricSetup('face')}
            disabled={isSettingUp}
          >
            <Text style={styles.optionIcon}>😊</Text>
            <Text style={styles.optionTitle}>Face ID</Text>
            <Text style={styles.optionDescription}>
              Use face recognition to unlock
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isSettingUp}
        >
          <Text style={styles.skipButtonText}>
            {isSettingUp ? 'Setting up...' : 'Skip for now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  backButtonText: {
    fontSize: 18,
    color: '#4682b4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131313',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  skipButton: {
    padding: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default BiometricSetupScreen;
