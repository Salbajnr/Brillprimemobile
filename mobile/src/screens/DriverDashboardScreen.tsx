
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface DriverStats {
  totalEarnings: number;
  completedOrders: number;
  activeOrders: number;
  rating: number;
  isOnline: boolean;
}

const DriverDashboardScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    completedOrders: 0,
    activeOrders: 0,
    rating: 0,
    isOnline: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverStats();
  }, []);

  const loadDriverStats = async () => {
    try {
      const response = await apiService.get('/api/driver/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading driver stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverStats();
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    try {
      const response = await apiService.post('/api/driver/toggle-status', {
        isOnline: !stats.isOnline
      });
      setStats(prev => ({ ...prev, isOnline: !prev.isOnline }));
      Alert.alert('Status Updated', `You are now ${!stats.isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  const quickActions = [
    {
      title: 'View Active Orders',
      icon: '📦',
      onPress: () => navigation.navigate('TrackOrder'),
      color: '#4682b4',
    },
    {
      title: 'Order History',
      icon: '📋',
      onPress: () => navigation.navigate('OrderHistory'),
      color: '#28a745',
    },
    {
      title: 'Earnings',
      icon: '💰',
      onPress: () => navigation.navigate('WalletBalance'),
      color: '#ffc107',
    },
    {
      title: 'Support',
      icon: '🆘',
      onPress: () => navigation.navigate('Support'),
      color: '#dc3545',
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Online Status Toggle */}
        <View style={styles.statusContainer}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusText, { color: stats.isOnline ? '#28a745' : '#dc3545' }]}>
              {stats.isOnline ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: stats.isOnline ? '#dc3545' : '#28a745' }]}
            onPress={toggleOnlineStatus}
          >
            <Text style={styles.toggleButtonText}>
              {stats.isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₦{stats.totalEarnings.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completedOrders}</Text>
              <Text style={styles.statLabel}>Completed Orders</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeOrders}</Text>
              <Text style={styles.statLabel}>Active Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>⭐ {stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <Text style={styles.activityIcon}>✅</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Order Completed</Text>
                <Text style={styles.activityDescription}>Fuel delivery to Victoria Island</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
              <Text style={styles.activityAmount}>+₦2,500</Text>
            </View>
            
            <View style={styles.activityItem}>
              <Text style={styles.activityIcon}>📦</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New Order Assigned</Text>
                <Text style={styles.activityDescription}>Package delivery to Lekki</Text>
                <Text style={styles.activityTime}>4 hours ago</Text>
              </View>
              <Text style={styles.activityAmount}>₦1,800</Text>
            </View>
          </View>
        </View>

        {/* Performance Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Performance Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Increase your earnings</Text>
              <Text style={styles.tipDescription}>
                Stay online during peak hours (8-10 AM, 6-8 PM) to get more orders
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131313',
  },
  profileButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4682b4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
  },
  activityContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default DriverDashboardScreen;
