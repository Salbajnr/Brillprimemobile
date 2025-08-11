
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const OTPVerificationScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<TextInput[]>([]);
  const { email, phone, verificationType = 'email' } = route.params || {};

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/verify-otp', {
        otp: otpCode,
        email,
        phone,
        verificationType
      });

      if (response.success) {
        Alert.alert('Success', 'Verification successful!', [
          {
            text: 'OK',
            onPress: () => {
              if (verificationType === 'phone') {
                navigation.navigate('Home');
              } else {
                navigation.navigate('SignIn');
              }
            }
          }
        ]);
      } else {
        Alert.alert('Error', response.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const response = await apiService.post('/auth/resend-otp', {
        email,
        phone,
        verificationType
      });

      if (response.success) {
        Alert.alert('Success', 'OTP has been resent successfully');
        setResendTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
      } else {
        Alert.alert('Error', response.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your {verificationType === 'email' ? 'Email' : 'Phone'}</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to {verificationType === 'email' ? email : phone}
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              digit && styles.filledOtpInput
            ]}
            value={digit}
            onChangeText={(text) => handleOtpChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.verifyButton,
          otp.join('').length !== 6 && styles.disabledButton
        ]}
        onPress={handleVerifyOtp}
        disabled={otp.join('').length !== 6 || loading}
      >
        <Text style={[
          styles.verifyButtonText,
          otp.join('').length !== 6 && styles.disabledButtonText
        ]}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>
          Didn't receive the code?
        </Text>
        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={!canResend || loading}
        >
          <Text style={[
            styles.resendButton,
            (!canResend || loading) && styles.disabledResendButton
          ]}>
            {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filledOtpInput: {
    borderColor: '#4682b4',
    backgroundColor: '#f0f8ff',
  },
  verifyButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#999',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    fontSize: 16,
    color: '#4682b4',
    fontWeight: 'bold',
  },
  disabledResendButton: {
    color: '#ccc',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

export default OTPVerificationScreen;
