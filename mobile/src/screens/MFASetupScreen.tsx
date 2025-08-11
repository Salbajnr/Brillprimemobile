
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';

const MFASetupScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedMethod, setSelectedMethod] = useState<'SMS' | 'EMAIL' | 'TOTP' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [step, setStep] = useState<'select' | 'setup' | 'verify' | 'complete'>('select');
  const [loading, setLoading] = useState(false);

  const handleMFASetup = async () => {
    if (!selectedMethod) return;
    
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setStep('verify');
        setLoading(false);
        Alert.alert('Setup Started', `${selectedMethod} MFA has been configured`);
      }, 1500);
    } catch (error) {
      Alert.alert('Setup Failed', 'Failed to setup MFA');
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      Alert.alert('Invalid Token', 'Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      // Simulate verification
      setTimeout(() => {
        setStep('complete');
        setLoading(false);
        Alert.alert('MFA Verified', 'Multi-factor authentication is now active');
      }, 1500);
    } catch (error) {
      Alert.alert('Verification Failed', 'Invalid verification token');
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Choose MFA Method</Text>
      
      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'TOTP' && styles.selectedCard]}
        onPress={() => setSelectedMethod('TOTP')}
      >
        <Text style={styles.methodIcon}>📱</Text>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Authenticator App</Text>
          <Text style={styles.methodDescription}>
            Use Google Authenticator, Authy, or similar apps
          </Text>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'SMS' && styles.selectedCard]}
        onPress={() => setSelectedMethod('SMS')}
      >
        <Text style={styles.methodIcon}>💬</Text>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>SMS Text Message</Text>
          <Text style={styles.methodDescription}>
            Receive codes via text message
          </Text>
        </View>
      </TouchableOpacity>

      {selectedMethod === 'SMS' && (
        <TextInput
          style={styles.input}
          placeholder="+234xxxxxxxxxx"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      )}

      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'EMAIL' && styles.selectedCard]}
        onPress={() => setSelectedMethod('EMAIL')}
      >
        <Text style={styles.methodIcon}>📧</Text>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Email Verification</Text>
          <Text style={styles.methodDescription}>
            Receive codes via email
          </Text>
        </View>
      </TouchableOpacity>

      {selectedMethod === 'EMAIL' && (
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      )}

      <TouchableOpacity
        style={[styles.continueButton, !selectedMethod && styles.disabledButton]}
        onPress={handleMFASetup}
        disabled={loading || !selectedMethod}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Setting up...' : 'Continue Setup'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerification = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Verify Setup</Text>
      <Text style={styles.subtitle}>
        Enter the verification code from your {selectedMethod?.toLowerCase()}
      </Text>

      <View style={styles.tokenContainer}>
        <Text style={styles.tokenIcon}>🔑</Text>
        <TextInput
          style={styles.tokenInput}
          placeholder="Enter 6-digit code"
          value={verificationToken}
          onChangeText={setVerificationToken}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
      </View>

      <TouchableOpacity
        style={[styles.continueButton, verificationToken.length !== 6 && styles.disabledButton]}
        onPress={handleVerification}
        disabled={loading || verificationToken.length !== 6}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Verifying...' : 'Verify & Enable MFA'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.content}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.title}>MFA Enabled Successfully</Text>
      <Text style={styles.subtitle}>
        Your account is now protected with multi-factor authentication
      </Text>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => navigation.navigate('AccountSettings')}
      >
        <Text style={styles.continueButtonText}>Return to Account Settings</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multi-Factor Authentication</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {step === 'select' && renderMethodSelection()}
        {step === 'verify' && renderVerification()}
        {step === 'complete' && renderComplete()}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131313',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  methodCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedCard: {
    borderColor: '#4682b4',
    backgroundColor: '#f0f8ff',
  },
  methodIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  recommendedBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  recommendedText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  tokenContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  tokenIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    width: '80%',
  },
  continueButton: {
    backgroundColor: '#4682b4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default MFASetupScreen;
