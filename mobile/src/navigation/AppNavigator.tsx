
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Import all screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import WalletBalanceScreen from '../screens/WalletBalanceScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SupportScreen from '../screens/SupportScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import TrackOrderScreen from '../screens/TrackOrderScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import BillPaymentsScreen from '../screens/BillPaymentsScreen';
import MoneyTransferScreen from '../screens/MoneyTransferScreen';
import FuelOrderingScreen from '../screens/FuelOrderingScreen';
import TollPaymentsScreen from '../screens/TollPaymentsScreen';
import LocationSetupScreen from '../screens/LocationSetupScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import BiometricSetupScreen from '../screens/BiometricSetupScreen';
import MFASetupScreen from '../screens/MFASetupScreen';
import IdentityVerificationScreen from '../screens/IdentityVerificationScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import MerchantDashboardScreen from '../screens/MerchantDashboardScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import VendorFeedScreen from '../screens/VendorFeedScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  OTPVerification: { email: string; type: 'registration' | 'reset' };
  RoleSelection: undefined;
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  WalletBalance: undefined;
  Notifications: undefined;
  OrderHistory: undefined;
  Support: undefined;
  Messages: undefined;
  Cart: undefined;
  Checkout: undefined;
  QRScanner: { type: string };
  TrackOrder: { orderId: string };
  AccountSettings: undefined;
  BillPayments: undefined;
  MoneyTransfer: undefined;
  FuelOrdering: undefined;
  TollPayments: undefined;
  LocationSetup: undefined;
  PaymentMethods: undefined;
  BiometricSetup: undefined;
  MFASetup: undefined;
  IdentityVerification: undefined;
  DriverDashboard: undefined;
  MerchantDashboard: undefined;
  OrderConfirmation: { orderId: string };
  SearchResults: { query: string };
  VendorFeed: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' },
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="WalletBalance" component={WalletBalanceScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="BillPayments" component={BillPaymentsScreen} />
        <Stack.Screen name="MoneyTransfer" component={MoneyTransferScreen} />
        <Stack.Screen name="FuelOrdering" component={FuelOrderingScreen} />
        <Stack.Screen name="TollPayments" component={TollPaymentsScreen} />
        <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
        <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        <Stack.Screen name="MFASetup" component={MFASetupScreen} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
        <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
        <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
        <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="VendorFeed" component={VendorFeedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
