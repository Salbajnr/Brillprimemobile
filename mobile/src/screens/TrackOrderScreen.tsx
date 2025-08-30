import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface OrderStatus {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
}

interface TrackingData {
  orderId: string;
  orderType: string;
  currentStatus: string;
  estimatedDelivery: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
  statusHistory: OrderStatus[];
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

const TrackOrderScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const orderId = route?.params?.orderId;

  useEffect(() => {
    if (orderId) {
      loadTrackingData();
      // Set up real-time updates
      const interval = setInterval(loadTrackingData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const loadTrackingData = async () => {
    try {
      const response = await apiService.get(`/api/tracking/order/${orderId}`);
      if (response.success) {
        setTrackingData(response.data);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrackingData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffaa00';
      case 'confirmed': return '#4682b4';
      case 'preparing': return '#0099cc';
      case 'in_transit': return '#00aa44';
      case 'delivered': return '#00cc00';
      case 'cancelled': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'preparing': return '👨‍🍳';
      case 'in_transit': return '🚗';
      case 'delivered': return '📦';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const callDriver = () => {
    if (trackingData?.driverPhone) {
      // In a real app, you would use Linking.openURL(`tel:${trackingData.driverPhone}`)
      console.log('Calling driver:', trackingData.driverPhone);
    }
  };

  const viewOnMap = () => {
    if (trackingData?.driverLocation) {
      navigation.navigate('LiveTracking', { 
        orderId,
        driverLocation: trackingData.driverLocation 
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!trackingData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Order Info */}
      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>Order #{trackingData.orderId}</Text>
        <Text style={styles.orderType}>{trackingData.orderType}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trackingData.currentStatus) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(trackingData.currentStatus)}</Text>
          <Text style={styles.statusText}>{trackingData.currentStatus.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.estimatedDelivery}>
          Estimated Delivery: {trackingData.estimatedDelivery}
        </Text>
      </View>

      {/* Driver Info */}
      {trackingData.driverName && (
        <View style={styles.driverInfo}>
          <Text style={styles.sectionTitle}>Your Driver</Text>
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitial}>
                {trackingData.driverName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{trackingData.driverName}</Text>
              <Text style={styles.driverPhone}>{trackingData.driverPhone}</Text>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionButton} onPress={callDriver}>
                <Text style={styles.actionButtonText}>📞</Text>
              </TouchableOpacity>
              {trackingData.driverLocation && (
                <TouchableOpacity style={styles.actionButton} onPress={viewOnMap}>
                  <Text style={styles.actionButtonText}>🗺️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.orderItems}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {trackingData.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetails}>
              Qty: {item.quantity} × ₦{item.price.toLocaleString()}
            </Text>
            <Text style={styles.itemTotal}>
              ₦{(item.quantity * item.price).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Status Timeline */}
      <View style={styles.statusTimeline}>
        <Text style={styles.sectionTitle}>Order Timeline</Text>
        {trackingData.statusHistory.map((status, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineIcon}>
              <Text style={styles.timelineIconText}>{getStatusIcon(status.status)}</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStatus}>{status.status.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.timelineDescription}>{status.description}</Text>
              {status.location && (
                <Text style={styles.timelineLocation}>📍 {status.location}</Text>
              )}
              <Text style={styles.timelineTime}>{status.timestamp}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {trackingData.currentStatus !== 'delivered' && trackingData.currentStatus !== 'cancelled' && (
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.supportButton}
          onPress={() => navigation.navigate('Support')}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Rating - Show only when delivered */}
      {trackingData.currentStatus === 'DELIVERED' && (
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Rate Your Delivery</Text>
          <Text style={styles.ratingDescription}>
            How was your delivery experience with {trackingData.driverName}?
          </Text>
          <View style={styles.starsPreview}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} style={styles.starPreview}>⭐</Text>
            ))}
          </View>
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => navigation.navigate('RateDelivery', { orderId: trackingData.orderId })}
          >
            <Text style={styles.rateButtonText}>Rate This Delivery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Real-time Tracking Button */}
      {['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT'].includes(trackingData.currentStatus) && (
        <View style={styles.trackingSection}>
          <TouchableOpacity
            style={styles.realTimeButton}
            onPress={() => navigation.navigate('RealTimeTracking', { orderId: trackingData.orderId })}
          >
            <Text style={styles.realTimeButtonText}>📍 Real-Time Tracking</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
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
  refreshButton: {
    fontSize: 20,
  },
  orderInfo: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  orderType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#666',
  },
  driverInfo: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4682b4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  driverInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  driverPhone: {
    fontSize: 14,
    color: '#666',
  },
  driverActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 25,
    marginLeft: 10,
  },
  actionButtonText: {
    fontSize: 18,
  },
  orderItems: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4682b4',
    textAlign: 'right',
  },
  statusTimeline: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  timelineIconText: {
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  timelineLocation: {
    fontSize: 12,
    color: '#4682b4',
    marginBottom: 3,
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    padding: 15,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: '#4682b4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingSection: {
    backgroundColor: '#F0FDF4',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  ratingDescription: {
    fontSize: 14,
    color: '#065F46',
    marginBottom: 15,
    textAlign: 'center',
  },
  starsPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  starPreview: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  rateButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingSection: {
    margin: 15,
    marginTop: 0,
  },
  realTimeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  realTimeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TrackOrderScreen;