// Main navigation structure for React Native app
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList, TabParamList } from '../types';
import { useAppSelector } from '../store/hooks';

// Import screens (these would need to be created)
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ConsumerHomeScreen from '../screens/ConsumerHomeScreen';
import MerchantDashboardScreen from '../screens/MerchantDashboardScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ScannerScreen from '../screens/ScannerScreen';
import MapsScreen from '../screens/MapsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Bottom Tab Navigator for authenticated users
function TabNavigator() {
  const user = useAppSelector(state => state.auth.user);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Orders':
              iconName = 'shopping-bag';
              break;
            case 'Chat':
              iconName = 'chat';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4682b4',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={getHomeScreen(user?.role)} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Search" 
        component={OrdersScreen} 
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ title: 'Chat' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Get appropriate home screen based on user role
function getHomeScreen(role?: string) {
  switch (role) {
    case 'MERCHANT':
      return MerchantDashboardScreen;
    case 'DRIVER':
      return DriverDashboardScreen;
    case 'ADMIN':
      return AdminDashboardScreen;
    default:
      return ConsumerHomeScreen;
  }
}

// Auth Navigator for unauthenticated users
function AuthNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="Wallet" 
            component={WalletScreen} 
            options={{ 
              headerShown: true, 
              title: 'Wallet',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Notifications',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="Scanner" 
            component={ScannerScreen} 
            options={{ 
              headerShown: true, 
              title: 'Scanner',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="Maps" 
            component={MapsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Map',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Settings',
              headerBackTitleVisible: false,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

export default AppNavigator;