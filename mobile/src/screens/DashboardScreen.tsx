
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NavigationProps } from '../shared/types';
import { useAuth } from '../hooks/useAuth';

const DashboardScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { user } = useAuth();

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName);
  };

  const renderRoleBasedContent = () => {
    switch (user?.role) {
      case 'CONSUMER':
        return (
          <View style={styles.roleContent}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigateToScreen('FuelOrdering')}
            >
              <Text style={styles.actionTitle}>Order Fuel</Text>
              <Text style={styles.actionSubtitle}>Get fuel delivered to your location</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigateToScreen('TollPayments')}
            >
              <Text style={styles.actionTitle}>Pay Toll</Text>
              <Text style={styles.actionSubtitle}>Quick toll gate payments</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'DRIVER':
        return (
          <View style={styles.roleContent}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigateToScreen('DriverDashboard')}
            >
              <Text style={styles.actionTitle}>Active Orders</Text>
              <Text style={styles.actionSubtitle}>View and manage deliveries</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'MERCHANT':
        return (
          <View style={styles.roleContent}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigateToScreen('MerchantDashboard')}
            >
              <Text style={styles.actionTitle}>Manage Store</Text>
              <Text style={styles.actionSubtitle}>Products and orders</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.fullName}</Text>
      </View>

      {renderRoleBasedContent()}

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigateToScreen('WalletBalance')}
        >
          <Text style={styles.quickActionText}>Wallet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigateToScreen('OrderHistory')}
        >
          <Text style={styles.quickActionText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigateToScreen('Support')}
        >
          <Text style={styles.quickActionText}>Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#4682b4',
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  roleContent: {
    padding: 20,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  quickAction: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4682b4',
  },
});

export default DashboardScreen;
