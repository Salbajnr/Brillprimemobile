import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface MerchantStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  inventoryItems: number;
  rating: number;
}

const MerchantDashboardScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [stats, setStats] = useState<MerchantStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    inventoryItems: 0,
    rating: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchantStats();
  }, []);

  const loadMerchantStats = async () => {
    try {
      const response = await apiService.get('/api/merchant/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading merchant stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchantStats();
    setRefreshing(false);
  };

  const quickActions = [
    {
      title: 'Manage Inventory',
      icon: '📦',
      onPress: () => Alert.alert('Feature', 'Inventory management coming soon'),
      color: '#4682b4',
    },
    {
      title: 'View Orders',
      icon: '📋',
      onPress: () => navigation.navigate('OrderHistory'),
      color: '#28a745',
    },
    {
      title: 'Analytics',
      icon: '📊',
      onPress: () => Alert.alert('Feature', 'Analytics coming soon'),
      color: '#ffc107',
    },
    {
      title: 'Settings',
      icon: '⚙️',
      onPress: () => navigation.navigate('AccountSettings'),
      color: '#6c757d',
    },
  ];

  const recentOrders = [
    {
      id: 'ORD-001',
      customerName: 'John Doe',
      items: ['Laptop Stand', 'Wireless Mouse'],
      amount: 25000,
      status: 'pending',
      time: '10 minutes ago',
    },
    {
      id: 'ORD-002',
      customerName: 'Jane Smith',
      items: ['Phone Case', 'Screen Protector'],
      amount: 8500,
      status: 'completed',
      time: '1 hour ago',
    },
    {
      id: 'ORD-003',
      customerName: 'Mike Johnson',
      items: ['Bluetooth Headphones'],
      amount: 15000,
      status: 'processing',
      time: '2 hours ago',
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
        <Text style={styles.headerTitle}>Merchant Dashboard</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileIcon}>🏪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₦{stats.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pendingOrders}</Text>
              <Text style={styles.statLabel}>Pending Orders</Text>
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

        {/* Recent Orders */}
        <View style={styles.ordersContainer}>
          <View style={styles.orderHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ordersList}>
            {recentOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>#{order.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.customerName}>{order.customerName}</Text>
                <Text style={styles.orderItems}>
                  {order.items.join(', ')}
                </Text>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderAmount}>₦{order.amount.toLocaleString()}</Text>
                  <Text style={styles.orderTime}>{order.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Business Insights</Text>

          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>📈</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Sales Growth</Text>
              <Text style={styles.insightDescription}>
                Your sales increased by 15% this week compared to last week
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>⭐</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Customer Satisfaction</Text>
              <Text style={styles.insightDescription}>
                Maintain your excellent rating by continuing quality service
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#ffc107';
    case 'processing':
      return '#17a2b8';
    case 'completed':
      return '#28a745';
    case 'cancelled':
      return '#dc3545';
    default:
      return '#6c757d';
  }
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
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  ordersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4682b4',
    fontWeight: '500',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131313',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 14,
    color: '#131313',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4',
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MerchantDashboardScreen;