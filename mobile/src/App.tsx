
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components
import ErrorBoundary from './components/ErrorBoundary';

// Import all screens
import SplashScreen from './screens/SplashScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import SupportScreen from './screens/SupportScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import WalletBalanceScreen from './screens/WalletBalanceScreen';
import MessagesScreen from './screens/MessagesScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import TrackOrderScreen from './screens/TrackOrderScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import BillPaymentsScreen from './screens/BillPaymentsScreen';
import MoneyTransferScreen from './screens/MoneyTransferScreen';
import FuelOrderingScreen from './screens/FuelOrderingScreen';
import TollPaymentsScreen from './screens/TollPaymentsScreen';
import LocationSetupScreen from './screens/LocationSetupScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import BiometricSetupScreen from './screens/BiometricSetupScreen';
import MFASetupScreen from './screens/MFASetupScreen';
import IdentityVerificationScreen from './screens/IdentityVerificationScreen';
import DriverDashboardScreen from './screens/DriverDashboardScreen';
import MerchantDashboardScreen from './screens/MerchantDashboardScreen';
import OrderConfirmationScreen from './screens/OrderConfirmationScreen';
import SearchResultsScreen from './screens/SearchResultsScreen';
import VendorFeedScreen from './screens/VendorFeedScreen';

// Import API service and hooks
import { apiService } from './services/api';
import useNetworkStatus from './hooks/useNetworkStatus';

const Stack = createStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

const AppContent: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<string>('Splash');
  const [isLoading, setIsLoading] = useState(true);
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    checkInitialRoute();
    setupGlobalErrorHandler();
  }, []);

  const checkInitialRoute = async () => {
    try {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      // Check for existing user session
      const userSession = await AsyncStorage.getItem('userSession');
      
      if (!hasCompletedOnboarding) {
        setInitialRoute('Onboarding');
      } else if (userSession) {
        // Validate session with backend if online
        if (networkStatus.isConnected) {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            setInitialRoute('Home');
          } else {
            setInitialRoute('SignIn');
          }
        } else {
          // Offline mode - trust local session
          setInitialRoute('Home');
        }
      } else {
        setInitialRoute('SignIn');
      }
    } catch (error) {
      console.error('Error checking initial route:', error);
      setInitialRoute('SignIn');
    } finally {
      setIsLoading(false);
    }
  };

  const setupGlobalErrorHandler = () => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Log to analytics service (only when online)
      if (networkStatus.isConnected) {
        apiService.post('/analytics/log-error', {
          error: args.join(' '),
          timestamp: new Date().toISOString(),
          platform: 'mobile',
          networkStatus,
        }).catch(() => {}); // Silent fail for logging
      }
      
      originalConsoleError(...args);
    };
  };

  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#4682b4" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4682b4',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            cardStyle: {
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RoleSelection"
            component={RoleSelectionScreen}
            options={{ title: 'Choose Your Role', headerShown: false }}
          />
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: 'Welcome Back', headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ title: 'Create Account', headerShown: false }}
          />
          <Stack.Screen
            name="OTPVerification"
            component={OTPVerificationScreen}
            options={{ title: 'Verify Phone', headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: 'Reset Password', headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'New Password', headerShown: false }}
          />
          <Stack.Screen
            name="LocationSetup"
            component={LocationSetupScreen}
            options={{ title: 'Location Access', headerShown: false }}
          />
          <Stack.Screen
            name="BiometricSetup"
            component={BiometricSetupScreen}
            options={{ title: 'Biometric Security', headerShown: false }}
          />
          <Stack.Screen
            name="MFASetup"
            component={MFASetupScreen}
            options={{ title: 'Two-Factor Auth', headerShown: false }}
          />
          <Stack.Screen
            name="IdentityVerification"
            component={IdentityVerificationScreen}
            options={{ title: 'Verify Identity', headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'BrillPrime', headerShown: false }}
          />
          <Stack.Screen
            name="DriverDashboard"
            component={DriverDashboardScreen}
            options={{ title: 'Driver Dashboard', headerShown: false }}
          />
          <Stack.Screen
            name="MerchantDashboard"
            component={MerchantDashboardScreen}
            options={{ title: 'Merchant Dashboard', headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: 'Edit Profile' }}
          />
          <Stack.Screen
            name="AccountSettings"
            component={AccountSettingsScreen}
            options={{ title: 'Account Settings' }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletBalanceScreen}
            options={{ title: 'Wallet' }}
          />
          <Stack.Screen
            name="OrderHistory"
            component={OrderHistoryScreen}
            options={{ title: 'Order History' }}
          />
          <Stack.Screen
            name="TrackOrder"
            component={TrackOrderScreen}
            options={{ title: 'Track Order' }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{ title: 'Shopping Cart' }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ title: 'Checkout' }}
          />
          <Stack.Screen
            name="OrderConfirmation"
            component={OrderConfirmationScreen}
            options={{ title: 'Order Confirmed', headerShown: false }}
          />
          <Stack.Screen
            name="PaymentMethods"
            component={PaymentMethodsScreen}
            options={{ title: 'Payment Methods' }}
          />
          <Stack.Screen
            name="BillPayments"
            component={BillPaymentsScreen}
            options={{ title: 'Bill Payments' }}
          />
          <Stack.Screen
            name="MoneyTransfer"
            component={MoneyTransferScreen}
            options={{ title: 'Send Money' }}
          />
          <Stack.Screen
            name="FuelOrdering"
            component={FuelOrderingScreen}
            options={{ title: 'Fuel Delivery' }}
          />
          <Stack.Screen
            name="TollPayments"
            component={TollPaymentsScreen}
            options={{ title: 'Toll Payments' }}
          />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{ title: 'QR Scanner', headerShown: false }}
          />
          <Stack.Screen
            name="SearchResults"
            component={SearchResultsScreen}
            options={{ title: 'Search Results' }}
          />
          <Stack.Screen
            name="VendorFeed"
            component={VendorFeedScreen}
            options={{ title: 'Vendors' }}
          />
          <Stack.Screen
            name="Messages"
            component={MessagesScreen}
            options={{ title: 'Messages' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={{ title: 'Support' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
