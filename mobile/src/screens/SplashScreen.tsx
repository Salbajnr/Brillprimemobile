
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProps } from '../shared/types';

const SplashScreen: React.FC<NavigationProps> = ({ navigation }) => {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for stored user session
      const userSession = await AsyncStorage.getItem('userSession');
      
      setTimeout(() => {
        if (userSession) {
          navigation.replace('Home');
        } else {
          navigation.replace('SignIn');
        }
      }, 2000);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setTimeout(() => {
        navigation.replace('SignIn');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>BrillPrime</Text>
      <Text style={styles.subtitle}>Your Premium Service Platform</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
});

export default SplashScreen;
