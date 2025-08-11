
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';

interface OrderDetails {
  id: string;
  type: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  deliveryAddress: string;
  estimatedDelivery: string;
  paymentMethod: string;
}

const OrderConfirmationScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [orderDetails] = useState<OrderDetails>({
    id: `ORD-${Date.now()}`,
    type: route?.params?.orderType || 'General',
    items: route?.params?.items || [
      { name: 'Sample Item', quantity: 1, price: 5000 }
    ],
    total: route?.params?.total || 5000,
    deliveryAddress: route?.params?.address || 'Lagos, Nigeria',
    estimatedDelivery: '30-45 minutes',
    paymentMethod: 'Wallet',
  });

  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.navigate('TrackOrder', { orderId: orderDetails.id });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation, orderDetails.id]);

  const handleTrackOrder = () => {
    navigation.navigate('TrackOrder', { orderId: orderDetails.id });
  };

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  const handleShareOrder = () => {
    Alert.alert(
      'Share Order',
      `Order ${orderDetails.id} has been confirmed and will be delivered to ${orderDetails.deliveryAddress}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => console.log('Sharing order details') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Order Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your order has been successfully placed and confirmed
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>Order #{orderDetails.id}</Text>
            <View style={styles.orderTypeBadge}>
              <Text style={styles.orderTypeText}>{orderDetails.type}</Text>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.itemsContainer}>
            <Text style={styles.sectionTitle}>Items Ordered</Text>
            {orderDetails.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₦{orderDetails.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Delivery Information */}
          <View style={styles.deliveryContainer}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                <Text style={styles.infoValue}>{orderDetails.deliveryAddress}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estimated Delivery</Text>
                <Text style={styles.infoValue}>{orderDetails.estimatedDelivery}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💳</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{orderDetails.paymentMethod}</Text>
              </View>
            </View>
          </View>

          {/* Order Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.statusTimeline}>
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, styles.completedDot]} />
                <Text style={styles.statusText}>Order Confirmed</Text>
                <Text style={styles.statusTime}>Just now</Text>
              </View>
              
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, styles.pendingDot]} />
                <Text style={styles.statusText}>Preparing Order</Text>
                <Text style={styles.statusTime}>In progress</Text>
              </View>
              
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, styles.upcomingDot]} />
                <Text style={styles.statusText}>Out for Delivery</Text>
                <Text style={styles.statusTime}>Upcoming</Text>
              </View>
              
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, styles.upcomingDot]} />
                <Text style={styles.statusText}>Delivered</Text>
                <Text style={styles.statusTime}>Upcoming</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Auto-redirect Notice */}
        <View style={styles.redirectNotice}>
          <Text style={styles.redirectText}>
            Automatically redirecting to order tracking in {countdown} seconds
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.trackButton}
          onPress={handleTrackOrder}
        >
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareOrder}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  successHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
  },
  orderTypeBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderTypeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#131313',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#131313',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131313',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  deliveryContainer: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#131313',
  },
  statusContainer: {
    marginBottom: 0,
  },
  statusTimeline: {
    paddingLeft: 16,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  completedDot: {
    backgroundColor: '#28a745',
  },
  pendingDot: {
    backgroundColor: '#ffc107',
  },
  upcomingDot: {
    backgroundColor: '#e9ecef',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#131313',
  },
  statusTime: {
    fontSize: 12,
    color: '#666',
  },
  redirectNotice: {
    backgroundColor: '#fff3cd',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  redirectText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  actionButtons: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  trackButton: {
    backgroundColor: '#4682b4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  homeButtonText: {
    color: '#131313',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OrderConfirmationScreen;
