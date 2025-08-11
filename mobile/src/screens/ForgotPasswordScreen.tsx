
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const ForgotPasswordScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });

      if (response.success) {
        Alert.alert(
          'Reset Link Sent',
          'We have sent a password reset link to your email address. Please check your inbox and follow the instructions.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to send reset link. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!email.trim() || !validateEmail(email)) && styles.disabledButton
            ]}
            onPress={handleSendResetLink}
            disabled={!email.trim() || !validateEmail(email) || loading}
          >
            <Text style={[
              styles.sendButtonText,
              (!email.trim() || !validateEmail(email)) && styles.disabledButtonText
            ]}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backToSignInButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.backToSignInText}>
              Remember your password? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#999',
  },
  footer: {
    alignItems: 'center',
  },
  backToSignInButton: {
    paddingVertical: 10,
  },
  backToSignInText: {
    fontSize: 16,
    color: '#4682b4',
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
