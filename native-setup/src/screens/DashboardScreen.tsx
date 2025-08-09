
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../store/hooks';
import { apiService } from '../services/api';

interface DashboardData {
  metrics?: any;
  orders?: any[];
  notifications?: any[];
  wallet?: any;
}

const DashboardScreen: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  const fetchDashboardData = async () => {
    try {
      const promises = [];

      // Fetch data based on user role
      switch (user?.role) {
        case 'MERCHANT':
          promises.push(
            apiService.getMerchantMetrics(),
            apiService.getMerchantOrders(),
            apiService.getNotifications(),
            apiService.getWalletBalance()
          );
          break;
        case 'DRIVER':
          promises.push(
            apiService.getDriverDeliveries(),
            apiService.getNotifications(),
            apiService.getWalletBalance()
          );
          break;
        default: // CONSUMER
          promises.push(
            apiService.getOrders(),
            apiService.getNotifications(),
            apiService.getWalletBalance()
          );
      }

      const results = await Promise.allSettled(promises);
      
      const newData: DashboardData = {};
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          switch (index) {
            case 0:
              if (user?.role === 'MERCHANT') {
                newData.metrics = result.value.data;
              } else {
                newData.orders = result.value.data;
              }
              break;
            case 1:
              if (user?.role === 'MERCHANT') {
                newData.orders = result.value.data;
              } else {
                newData.notifications = result.value.data;
              }
              break;
            case 2:
              if (user?.role === 'MERCHANT') {
                newData.notifications = result.value.data;
              } else {
                newData.wallet = result.value.data;
              }
              break;
            case 3:
              newData.wallet = result.value.data;
              break;
          }
        }
      });

      setDashboardData(newData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderWelcomeCard = () => (
    <View style={styles.welcomeCard}>
      <Text style={styles.welcomeText}>Welcome back, {user?.fullName}!</Text>
      <Text style={styles.roleText}>{user?.role} Dashboard</Text>
    </View>
  );

  const renderQuickStats = () => {
    if (user?.role === 'MERCHANT' && dashboardData.metrics) {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="attach-money" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>₦{dashboardData.metrics.totalRevenue || '0'}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="shopping-bag" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{dashboardData.metrics.totalOrders || '0'}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={24} color="#FF9800" />
            <Text style={styles.statValue}>{dashboardData.metrics.todaysSales || '0'}</Text>
            <Text style={styles.statLabel}>Today's Sales</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="account-balance-wallet" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>₦{dashboardData.wallet?.balance || '0.00'}</Text>
          <Text style={styles.statLabel}>Wallet Balance</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="shopping-bag" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{dashboardData.orders?.length || '0'}</Text>
          <Text style={styles.statLabel}>Recent Orders</Text>
        </View>
      </View>
    );
  };

  const renderRecentOrders = () => {
    if (!dashboardData.orders || dashboardData.orders.length === 0) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {dashboardData.orders.slice(0, 3).map((order, index) => (
          <TouchableOpacity key={index} style={styles.orderItem}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>Order #{order.id}</Text>
              <Text style={styles.orderSubtitle}>₦{order.amount}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderNotifications = () => {
    if (!dashboardData.notifications || dashboardData.notifications.length === 0) {
      return null;
    }

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {dashboardData.notifications.slice(0, 3).map((notification, index) => (
          <TouchableOpacity key={index} style={styles.notificationItem}>
            <Icon name="notifications" size={20} color="#4682B4" />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationTime}>{notification.createdAt}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'confirmed':
        return '#2196F3';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4682B4" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderWelcomeCard()}
      {renderQuickStats()}
      {renderRecentOrders()}
      {renderNotifications()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  welcomeCard: {
    backgroundColor: '#4682B4',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4682B4',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default DashboardScreen;
