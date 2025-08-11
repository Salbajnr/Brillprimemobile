
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface Notification {
  id: string;
  type: 'payment' | 'delivery' | 'order' | 'security' | 'promotion';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

const NotificationsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiService.get('/api/notifications');
      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💳';
      case 'delivery': return '📦';
      case 'order': return '🛍️';
      case 'security': return '🔒';
      case 'promotion': return '🎉';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#00aa44';
      default: return '#666';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>{item.timestamp}</Text>
        </View>
        <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.unreadCount}>{unreadCount} unread</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateText}>No notifications yet</Text>
            <Text style={styles.emptyStateSubtext}>You'll see important updates here</Text>
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
  unreadCount: {
    color: '#e5f2ff',
    fontSize: 14,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
    marginTop: 5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4682b4',
    marginLeft: 5,
    marginTop: 5,
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

export default NotificationsScreen;
