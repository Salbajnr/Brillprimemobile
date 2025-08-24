
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

import RoleSelectionScreen from './screens/RoleSelectionScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import DriverDashboardScreen from './screens/DriverDashboardScreen';
import MerchantDashboardScreen from './screens/MerchantDashboardScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import OrderConfirmationScreen from './screens/OrderConfirmationScreen';
import TrackOrderScreen from './screens/TrackOrderScreen';
import WalletFundScreen from './screens/WalletFundScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import AddPaymentMethodScreen from './screens/AddPaymentMethodScreen';
import MessagesScreen from './screens/MessagesScreen';
import SupportScreen from './screens/SupportScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import FuelOrderingScreen from './screens/FuelOrderingScreen';
import TollPaymentsScreen from './screens/TollPaymentsScreen';
import BillPaymentsScreen from './screens/BillPaymentsScreen';
import MoneyTransferScreen from './screens/MoneyTransferScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import LocationSetupScreen from './screens/LocationSetupScreen';
import IdentityVerificationScreen from './screens/IdentityVerificationScreen';
import EnhancedVerificationScreen from './screens/EnhancedVerificationScreen';
import BiometricSetupScreen from './screens/BiometricSetupScreen';
import MFASetupScreen from './screens/MFASetupScreen';
import LegalComplianceScreen from './screens/LegalComplianceScreen';
import LiveChatEnhancedScreen from './screens/LiveChatEnhancedScreen';
import SearchResultsScreen from './screens/SearchResultsScreen';
import VendorFeedScreen from './screens/VendorFeedScreen';

import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import DashboardScreen from './screens/DashboardScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import WalletBalanceScreen from './screens/WalletBalanceScreen';
import NotificationsScreen from './screens/NotificationsScreen';

// Import optimizations
import { mobileBundleOptimizer } from './lib/bundle-optimizer';
import { usePerformance } from './hooks/usePerformance';
import { mobileCacheService } from './services/cache';
import { mobileOfflineService } from './services/offline';

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
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
                <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
                <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
                <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
                <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
                <Stack.Screen name="WalletBalance" component={WalletBalanceScreen} />
                <Stack.Screen name="WalletFund" component={WalletFundScreen} />
                <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
                <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Messages" component={MessagesScreen} />
                <Stack.Screen name="Support" component={SupportScreen} />
                <Stack.Screen name="Cart" component={CartScreen} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} />
                <Stack.Screen name="FuelOrdering" component={FuelOrderingScreen} />
                <Stack.Screen name="TollPayments" component={TollPaymentsScreen} />
                <Stack.Screen name="BillPayments" component={BillPaymentsScreen} />
                <Stack.Screen name="MoneyTransfer" component={MoneyTransferScreen} />
                <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
                <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
                <Stack.Screen name="EnhancedVerification" component={EnhancedVerificationScreen} />
                <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
                <Stack.Screen name="MFASetup" component={MFASetupScreen} />
                <Stack.Screen name="LegalCompliance" component={LegalComplianceScreen} />
                <Stack.Screen name="LiveChatEnhanced" component={LiveChatEnhancedScreen} />
                <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
                <Stack.Screen name="VendorFeed" component={VendorFeedScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
