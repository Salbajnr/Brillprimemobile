import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { setInitialized } from '../store/slices/appSlice';

const SplashScreen: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      dispatch(setInitialized(true));
    }, 2000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BrillPrime</Text>
      <Text style={styles.subtitle}>Financial Solutions Platform</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4682b4',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
  },
});

export default SplashScreen;