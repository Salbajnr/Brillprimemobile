
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
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

const Stack = createStackNavigator();
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#4682b4',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Splash" 
              component={SplashScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignIn" 
              component={SignInScreen}
              options={{ title: 'Sign In', headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{ title: 'Sign Up', headerShown: false }}
            />
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'BrillPrime', headerShown: false }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Profile', headerShown: false }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{ title: 'Notifications', headerShown: false }}
            />
            <Stack.Screen 
              name="OrderHistory" 
              component={OrderHistoryScreen}
              options={{ title: 'Order History', headerShown: false }}
            />
            <Stack.Screen 
              name="WalletBalance" 
              component={WalletBalanceScreen}
              options={{ title: 'My Wallet', headerShown: false }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ title: 'Edit Profile', headerShown: false }}
            />
            <Stack.Screen 
              name="Support" 
              component={SupportScreen}
              options={{ title: 'Support', headerShown: false }}
            />
            <Stack.Screen 
              name="Messages" 
              component={MessagesScreen}
              options={{ title: 'Messages', headerShown: false }}
            />
            <Stack.Screen 
              name="Cart" 
              component={CartScreen}
              options={{ title: 'Shopping Cart', headerShown: false }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ title: 'Checkout', headerShown: false }}
            />
            <Stack.Screen 
              name="QRScanner" 
              component={QRScannerScreen}
              options={{ title: 'QR Scanner', headerShown: false }}
            />
            <Stack.Screen 
              name="TrackOrder" 
              component={TrackOrderScreen}
              options={{ title: 'Track Order', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountSettings" 
              component={AccountSettingsScreen}
              options={{ title: 'Account Settings', headerShown: false }}
            />
            <Stack.Screen 
              name="BillPayments" 
              component={BillPaymentsScreen}
              options={{ title: 'Bill Payments', headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default App;
