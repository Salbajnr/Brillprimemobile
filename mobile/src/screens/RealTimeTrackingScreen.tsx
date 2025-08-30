
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../hooks/api';

interface OrderTracking {
  orderId: string;
  status: string;
  driverLocation: {
    latitude: number;
    longitude: number;
  } | null;
  estimatedArrival: string | null;
  trackingHistory: Array<{
    status: string;
    timestamp: string;
    notes?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  }>;
}

interface RouteParams {
  orderId: string;
}

export default function RealTimeTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrackingData = async () => {
    try {
      const response = await api.get(`/real-time-tracking/${orderId}`);
      if (response.data.success) {
        setTracking(response.data.data);
      } else {
        Alert.alert('Error', 'Failed to load tracking information');
      }
    } catch (error) {
      console.error('Tracking fetch error:', error);
      Alert.alert('Error', 'Failed to load tracking information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchTrackingData, 30000);
    
    return () => clearInterval(interval);
  }, [orderId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrackingData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#059669';
      case 'IN_TRANSIT': return '#3B82F6';
      case 'PICKED_UP': return '#F59E0B';
      case 'CONFIRMED': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '✅';
      case 'IN_TRANSIT': return '🚛';
      case 'PICKED_UP': return '📦';
      case 'CONFIRMED': return '✓';
      default: return '⏳';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (!tracking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Order Status */}
      <View style={styles.statusCard}>
        <Text style={styles.orderId}>Order #{tracking.orderId}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(tracking.status) }
        ]}>
          <Text style={styles.statusIcon}>{getStatusIcon(tracking.status)}</Text>
          <Text style={styles.statusText}>
            {tracking.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {tracking.estimatedArrival && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaLabel}>Estimated Arrival:</Text>
            <Text style={styles.etaTime}>
              {formatTime(tracking.estimatedArrival)}
            </Text>
          </View>
        )}
      </View>

      {/* Driver Location */}
      {tracking.driverLocation && (
        <View style={styles.locationCard}>
          <Text style={styles.sectionTitle}>Driver Location</Text>
          <Text style={styles.coordinates}>
            📍 {tracking.driverLocation.latitude.toFixed(4)}, {tracking.driverLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Tracking History */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Tracking History</Text>
        {tracking.trackingHistory.map((event, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyIcon}>
              <Text style={styles.historyIconText}>
                {getStatusIcon(event.status)}
              </Text>
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyStatus}>
                {event.status.replace('_', ' ').toUpperCase()}
              </Text>
              {event.notes && (
                <Text style={styles.historyNotes}>{event.notes}</Text>
              )}
              {event.location && (
                <Text style={styles.historyLocation}>
                  📍 {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                </Text>
              )}
              <Text style={styles.historyTime}>
                {formatTime(event.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Rate Delivery Button (if delivered) */}
      {tracking.status === 'DELIVERED' && (
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate Your Delivery</Text>
          <Text style={styles.ratingSubtitle}>
            How was your delivery experience?
          </Text>
          <TouchableOpacity
            style={styles.ratingButton}
            onPress={() => navigation.navigate('RateDelivery', { orderId })}
          >
            <Text style={styles.ratingButtonText}>Rate This Delivery</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    fontSize: 16,
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    fontSize: 18,
  },
  statusCard: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  orderId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
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
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  etaContainer: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  etaTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  coordinates: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  historyIconText: {
    fontSize: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  historyNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  historyLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 5,
  },
  historyTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingCard: {
    backgroundColor: '#ECFDF5',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 5,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 15,
  },
  ratingButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
