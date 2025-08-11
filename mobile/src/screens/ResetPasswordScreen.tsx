
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const ResetPasswordScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { token } = route.params || {};

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleResetPassword = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Invalid reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/reset-password', {
        token,
        newPassword: password
      });

      if (response.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been reset successfully. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Please enter your new password below.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeButtonText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeButtonText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={[
              styles.requirement,
              validatePassword(password) && styles.validRequirement
            ]}>
              • At least 8 characters long
            </Text>
            <Text style={[
              styles.requirement,
              password === confirmPassword && password.length > 0 && styles.validRequirement
            ]}>
              • Passwords match
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.resetButton,
              (!validatePassword(password) || password !== confirmPassword) && styles.disabledButton
            ]}
            onPress={handleResetPassword}
            disabled={!validatePassword(password) || password !== confirmPassword || loading}
          >
            <Text style={[
              styles.resetButtonText,
              (!validatePassword(password) || password !== confirmPassword) && styles.disabledButtonText
            ]}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backToSignInButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.backToSignInText}>
              Back to Sign In
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeButtonText: {
    color: '#4682b4',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  validRequirement: {
    color: '#28a745',
  },
  resetButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  resetButtonText: {
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

export default ResetPasswordScreen;
