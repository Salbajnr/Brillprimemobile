
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface Order {
  id: string;
  type: 'FUEL' | 'COMMODITY' | 'DELIVERY' | 'FOOD';
  productName: string;
  quantity: string;
  price: number;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_PROGRESS';
  date: string;
  time: string;
  merchantName?: string;
  driverName?: string;
}

const OrderHistoryScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiService.get('/api/orders');
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
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
      case 'COMPLETED': return '#00aa44';
      case 'CANCELLED': return '#ff4444';
      case 'IN_PROGRESS': return '#ffaa00';
      case 'PENDING': return '#666';
      default: return '#666';
    }
  };

  const getOrderIcon = (type: string) => {
    switch (type) {
      case 'FUEL': return '⛽';
      case 'COMMODITY': return '🛒';
      case 'DELIVERY': return '📦';
      case 'FOOD': return '🍽️';
      default: return '📋';
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderIcon}>{getOrderIcon(item.type)}</Text>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.productName}</Text>
          <Text style={styles.orderQuantity}>{item.quantity}</Text>
          {item.merchantName && (
            <Text style={styles.orderMerchant}>from {item.merchantName}</Text>
          )}
          {item.driverName && (
            <Text style={styles.orderDriver}>Driver: {item.driverName}</Text>
          )}
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderPrice}>₦{item.price.toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderDate}>{item.date}</Text>
        <Text style={styles.orderTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No orders yet</Text>
            <Text style={styles.emptyStateSubtext}>Your order history will appear here</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#4682b4',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  listContainer: {
    padding: 15,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  orderQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderMerchant: {
    fontSize: 12,
    color: '#4682b4',
  },
  orderDriver: {
    fontSize: 12,
    color: '#4682b4',
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  orderTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default OrderHistoryScreen;
