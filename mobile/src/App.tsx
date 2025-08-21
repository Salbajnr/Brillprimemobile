import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';

// Import screens
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';

import { mobileBundleOptimizer } from './src/lib/bundle-optimizer';
import { usePerformance } from './src/hooks/usePerformance';
import { mobileCacheService } from './src/services/cache';
import { mobileOfflineService } from './src/services/offline';


const Stack = createStackNavigator();

const App = () => {
  const { preloadCriticalData } = usePerformance();

  useEffect(() => {
    // Initialize performance optimizations
    const initializeOptimizations = async () => {
      try {
        await mobileBundleOptimizer.optimizeBundle();
        await mobileCacheService.optimizeCacheSize();
        await preloadCriticalData();
        
        // Initialize offline support
        console.log('🔄 Offline actions queued:', mobileOfflineService.getQueuedActionsCount());
        
        console.log('✅ Mobile performance optimizations initialized');
      } catch (error) {
        console.error('❌ Failed to initialize optimizations:', error);
      }
    };

    initializeOptimizations();
  }, [preloadCriticalData]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: true,
                }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;