
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppSelector } from '../store/hooks';
import { api } from '../services/api';

interface Order {
  id: number;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  deliveryAddress: string;
  estimatedDelivery?: string;
}

export default function OrderHistoryScreen({ navigation }: any) {
  const { user } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/user/${user?.id}`);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9500';
      case 'confirmed': return '#007aff';
      case 'preparing': return '#5856d6';
      case 'dispatched': return '#ff3b30';
      case 'delivered': return '#34c759';
      case 'cancelled': return '#8e8e93';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'dispatched': return 'On the way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const trackOrder = (order: Order) => {
    navigation.navigate('OrderTracking', { orderId: order.id });
  };

  const reorderItems = async (order: Order) => {
    try {
      const response = await api.post(`/orders/${order.id}/reorder`);
      if (response.data.success) {
        Alert.alert('Success', 'Items added to cart successfully!', [
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
          { text: 'Continue Shopping', style: 'cancel' }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reorder items');
    }
  };

  const renderOrder = (order: Order) => (
    <View key={order.id} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.itemCount}>{order.itemCount} items</Text>
        <Text style={styles.orderAmount}>₦{order.totalAmount.toLocaleString()}</Text>
      </View>

      <Text style={styles.deliveryAddress} numberOfLines={2}>
        📍 {order.deliveryAddress}
      </Text>

      {order.estimatedDelivery && (
        <Text style={styles.estimatedDelivery}>
          Estimated delivery: {formatDate(order.estimatedDelivery)}
        </Text>
      )}

      <View style={styles.orderActions}>
        {['pending', 'confirmed', 'preparing', 'dispatched'].includes(order.status) && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => trackOrder(order)}
          >
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}
        
        {order.status === 'delivered' && (
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => reorderItems(order)}
          >
            <Text style={styles.reorderButtonText}>Reorder</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>Track your past orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No orders yet</Text>
          <Text style={styles.emptyStateSubtitle}>Start shopping to see your orders here!</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.ordersList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {orders.map(renderOrder)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4682b4',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e6f3ff',
    marginTop: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#ff9500',
    fontWeight: '600',
    marginBottom: 15,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  reorderButton: {
    backgroundColor: '#34c759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  reorderButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
