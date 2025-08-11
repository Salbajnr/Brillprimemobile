
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { NavigationProps, MobileUser } from '../shared/types';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const userSession = await AsyncStorage.getItem('userSession');
      if (userSession) {
        setUser(JSON.parse(userSession));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await apiService.get('/api/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userSession');
    navigation.replace('SignIn');
  };

  const navigateToSection = (section: string) => {
    switch (section) {
      case 'orders':
        navigation.navigate('OrderHistory');
        break;
      case 'wallet':
        navigation.navigate('WalletBalance');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
      case 'support':
        navigation.navigate('Support');
        break;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.fullName || 'User'}</Text>
        <Text style={styles.roleText}>{user?.role || 'User'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData?.stats?.totalOrders || 0}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₦{dashboardData?.stats?.totalSpent?.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigateToSection('orders')}>
          <Text style={styles.actionText}>📦 Order History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => navigateToSection('wallet')}>
          <Text style={styles.actionText}>💰 Wallet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => navigateToSection('profile')}>
          <Text style={styles.actionText}>👤 Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => navigateToSection('support')}>
          <Text style={styles.actionText}>💬 Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4682b4',
    padding: 30,
    paddingTop: 60,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 18,
  },
  nameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  roleText: {
    color: '#e5f2ff',
    fontSize: 16,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default HomeScreen;
