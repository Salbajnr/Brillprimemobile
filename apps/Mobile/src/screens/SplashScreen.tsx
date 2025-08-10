
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');

      setTimeout(() => {
        if (authToken && userRole) {
          // User is authenticated, navigate to appropriate dashboard
          switch (userRole) {
            case 'consumer':
              navigation.navigate('ConsumerHome' as never);
              break;
            case 'driver':
              navigation.navigate('DriverDashboard' as never);
              break;
            case 'merchant':
              navigation.navigate('MerchantDashboard' as never);
              break;
            default:
              navigation.navigate('Dashboard' as never);
          }
        } else if (hasCompletedOnboarding) {
          navigation.navigate('Signin' as never);
        } else {
          navigation.navigate('Onboarding' as never);
        }
      }, 2000);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setTimeout(() => {
        navigation.navigate('Onboarding' as never);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>BrillPrime</Text>
        <Text style={styles.subtitle}>Financial Solutions for Nigeria</Text>
      </View>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
        <View style={[styles.loadingDot, { animationDelay: '0.2s' }]} />
        <View style={[styles.loadingDot, { animationDelay: '0.4s' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0aec0',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4299e1',
    marginHorizontal: 5,
    opacity: 0.3,
  },
});

export default SplashScreen;
