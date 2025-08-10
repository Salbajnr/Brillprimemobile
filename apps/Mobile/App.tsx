
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import SignupScreen from './src/screens/SignupScreen';
import SigninScreen from './src/screens/SigninScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import BiometricSetupScreen from './src/screens/BiometricSetupScreen';
import LocationSetupScreen from './src/screens/LocationSetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ConsumerHomeScreen from './src/screens/ConsumerHomeScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import MerchantDashboardScreen from './src/screens/MerchantDashboardScreen';

// Services
import { initializeNotifications } from './src/services/NotificationService';
import { initializeLocationService } from './src/services/LocationService';
import { APIService } from './src/services/APIService';

const Stack = createStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Initialize services
    initializeNotifications();
    initializeLocationService();
    
    // Configure API base URL for your Replit backend
    APIService.configure({
      baseURL: 'https://brillprime-monorepo-<your-username>.replit.app/api',
      timeout: 10000,
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar 
            barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
            backgroundColor="#1a365d"
          />
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Signin" component={SigninScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
            <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
            <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ConsumerHome" component={ConsumerHomeScreen} />
            <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
            <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
};

export default App;
