
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ConsumerHomeScreen from '../screens/ConsumerHomeScreen';
import MerchantDashboardScreen from '../screens/MerchantDashboardScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatScreen from '../screens/ChatScreen';
import WalletScreen from '../screens/WalletScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { useAppSelector } from '../store/hooks';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
  </Stack.Navigator>
);

// Consumer Tab Navigator
const ConsumerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        
        if (route.name === 'Home') {
          iconName = 'home';
        } else if (route.name === 'Orders') {
          iconName = 'shopping-bag';
        } else if (route.name === 'Chat') {
          iconName = 'chat';
        } else if (route.name === 'Wallet') {
          iconName = 'account-balance-wallet';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4682B4',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={ConsumerHomeScreen} />
    <Tab.Screen name="Orders" component={OrderHistoryScreen} />
    <Tab.Screen name="Chat" component={ChatScreen} />
    <Tab.Screen name="Wallet" component={WalletScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Merchant Tab Navigator
const MerchantTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        
        if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Orders') {
          iconName = 'shopping-bag';
        } else if (route.name === 'Products') {
          iconName = 'inventory';
        } else if (route.name === 'Analytics') {
          iconName = 'analytics';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4682B4',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
    <Tab.Screen name="Orders" component={OrderHistoryScreen} />
    <Tab.Screen name="Products" component={DashboardScreen} />
    <Tab.Screen name="Analytics" component={DashboardScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Driver Tab Navigator
const DriverTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        
        if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Deliveries') {
          iconName = 'local-shipping';
        } else if (route.name === 'Earnings') {
          iconName = 'attach-money';
        } else if (route.name === 'Map') {
          iconName = 'map';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4682B4',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DriverDashboardScreen} />
    <Tab.Screen name="Deliveries" component={OrderHistoryScreen} />
    <Tab.Screen name="Earnings" component={WalletScreen} />
    <Tab.Screen name="Map" component={DashboardScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main App Navigator
const MainAppNavigator = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;

  const getRoleSpecificNavigator = () => {
    switch (userRole) {
      case 'CONSUMER':
        return ConsumerTabs;
      case 'MERCHANT':
        return MerchantTabs;
      case 'DRIVER':
        return DriverTabs;
      default:
        return ConsumerTabs;
    }
  };

  const RoleNavigator = getRoleSpecificNavigator();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#4682B4',
      }}
    >
      <Drawer.Screen name="Main" component={RoleNavigator} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

// Root Navigator
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp" component={MainAppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
