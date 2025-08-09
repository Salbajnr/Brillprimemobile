import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '../services/websocket';
import { useAuth } from './use-auth';

interface RealTimeUpdate {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

interface UseRealTimeUpdatesOptions {
  autoConnect?: boolean;
  subscriptions?: string[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: string;
  actionUrl?: string;
}

interface OrderUpdate {
  orderId: string;
  status: string;
  timestamp: Date;
  updatedBy: string;
}

interface DeliveryUpdate {
  deliveryId: string;
  status: string;
  location?: any;
  timestamp: Date;
  driverId: string;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  message: string;
  timestamp: Date;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([]);
  const [deliveryUpdates, setDeliveryUpdates] = useState<DeliveryUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [presenceUpdates, setPresenceUpdates] = useState<any[]>([]);

  const { autoConnect = true, subscriptions = [] } = options;

  // Connection management
  const connect = useCallback(async () => {
    if (!isAuthenticated() || !user) return;

    try {
      await webSocketService.connect({
        url: window.location.origin,
        auth: { token: 'temp-token' } // TODO: Get actual token from auth
      });
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnected(false);
    }
  }, [user, isAuthenticated]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setConnected(false);
  }, []);

  // Event handlers
  const handleAuthSuccess = useCallback((data: any) => {
    console.log('WebSocket authenticated:', data);
    setConnected(true);
  }, []);

  const handleAuthError = useCallback((data: any) => {
    console.error('WebSocket authentication failed:', data);
    setConnected(false);
  }, []);

  const handleNotificationReceived = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50

    // Add to general updates
    setUpdates(prev => [{
      id: notification.id || Date.now().toString(),
      type: 'notification',
      data: notification,
      timestamp: new Date()
    }, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  const handleOrderStatusChanged = useCallback((update: OrderUpdate) => {
    setOrderUpdates(prev => [update, ...prev].slice(0, 50));

    setUpdates(prev => [{
      id: `order_${update.orderId}_${Date.now()}`,
      type: 'order_update',
      data: update,
      timestamp: new Date()
    }, ...prev].slice(0, 100));
  }, []);

  const handleDeliveryStatusChanged = useCallback((update: DeliveryUpdate) => {
    setDeliveryUpdates(prev => [update, ...prev].slice(0, 50));

    setUpdates(prev => [{
      id: `delivery_${update.deliveryId}_${Date.now()}`,
      type: 'delivery_update',
      data: update,
      timestamp: new Date()
    }, ...prev].slice(0, 100));
  }, []);

  const handleChatMessageReceived = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [message, ...prev].slice(0, 100));

    setUpdates(prev => [{
      id: `chat_${message.id || Date.now()}`,
      type: 'chat_message',
      data: message,
      timestamp: new Date()
    }, ...prev].slice(0, 100));
  }, []);

  const handlePresenceUpdate = useCallback((update: any) => {
    setPresenceUpdates(prev => {
      const filtered = prev.filter(p => p.userId !== update.userId);
      return [update, ...filtered].slice(0, 100);
    });
  }, []);

  const handleLocationUpdate = useCallback((update: any) => {
    setUpdates(prev => [{
      id: `location_${update.userId}_${Date.now()}`,
      type: 'location_update',
      data: update,
      timestamp: new Date()
    }, ...prev].slice(0, 100));
  }, []);

  // Setup event listeners
  useEffect(() => {
    webSocketService.on('auth:success', handleAuthSuccess);
    webSocketService.on('auth:error', handleAuthError);
    webSocketService.on('notification:received', handleNotificationReceived);
    webSocketService.on('order:status_changed', handleOrderStatusChanged);
    webSocketService.on('delivery:status_changed', handleDeliveryStatusChanged);
    webSocketService.on('delivery:location_update', handleLocationUpdate); // Corrected event name
    webSocketService.on('chat:message_received', handleChatMessageReceived);
    webSocketService.on('presence:update', handlePresenceUpdate);
    webSocketService.on('location:update', handleLocationUpdate);

    return () => {
      webSocketService.off('auth:success', handleAuthSuccess);
      webSocketService.off('auth:error', handleAuthError);
      webSocketService.off('notification:received', handleNotificationReceived);
      webSocketService.off('order:status_changed', handleOrderStatusChanged);
      webSocketService.off('delivery:status_changed', handleDeliveryStatusChanged);
      webSocketService.off('delivery:location_update', handleLocationUpdate); // Corrected event name
      webSocketService.off('chat:message_received', handleChatMessageReceived);
      webSocketService.off('presence:update', handlePresenceUpdate);
      webSocketService.off('location:update', handleLocationUpdate);
    };
  }, [
    handleAuthSuccess,
    handleAuthError,
    handleNotificationReceived,
    handleOrderStatusChanged,
    handleDeliveryStatusChanged,
    handleChatMessageReceived,
    handlePresenceUpdate,
    handleLocationUpdate
  ]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && isAuthenticated() && !connected) {
      connect();
    }

    return () => {
      if (!autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, isAuthenticated, connected, connect, disconnect]);

  // Real-time actions
  const sendNotification = useCallback((data: {
    targetUserId: number;
    type: string;
    title: string;
    message: string;
    priority?: string;
  }) => {
    webSocketService.sendNotification(data);
  }, []);

  const updateOrderStatus = useCallback((data: {
    orderId: string;
    status: string;
    updates: any;
  }) => {
    webSocketService.updateOrderStatus(data);
  }, []);

  const updateDeliveryStatus = useCallback((data: {
    deliveryId: string;
    status: string;
    location?: any;
    estimatedTime?: string;
    proof?: any;
  }) => {
    webSocketService.updateDeliveryStatus(data);
  }, []);

  const sendChatMessage = useCallback((data: {
    roomId: string;
    message: string;
    messageType?: string;
    attachments?: any[];
  }) => {
    webSocketService.sendChatMessage(data);
  }, []);

  const joinChatRoom = useCallback((roomId: string, roomType: string) => {
    webSocketService.joinChatRoom({ roomId, roomType });
  }, []);

  const leaveChatRoom = useCallback((roomId: string) => {
    webSocketService.leaveChatRoom({ roomId });
  }, []);

  const updateLocation = useCallback((data: {
    latitude: number;
    longitude: number;
    trackingType: string;
    sharingLevel: string;
  }) => {
    webSocketService.updateLocation(data);
  }, []);

  const switchRole = useCallback((targetRole: string) => {
    webSocketService.switchRole(targetRole);
  }, []);

  const applyForRole = useCallback((data: {
    targetRole: string;
    applicationData: any;
  }) => {
    webSocketService.applyForRole(data);
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    webSocketService.markNotificationAsRead(notificationId);

    // Update local state
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadNotificationsCount = useCallback(() => {
    return notifications.filter(notif => !notif.isRead).length;
  }, [notifications]);

  const getActiveDeliveries = useCallback(() => {
    return deliveryUpdates.filter(delivery =>
      ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)
    );
  }, [deliveryUpdates]);

  const getPendingOrders = useCallback(() => {
    return orderUpdates.filter(order =>
      ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status)
    );
  }, [orderUpdates]);

  const getOnlineUsers = useCallback(() => {
    return presenceUpdates.filter(presence => presence.status === 'online');
  }, [presenceUpdates]);

  return {
    // Connection state
    connected,
    connect,
    disconnect,

    // Data
    updates,
    notifications,
    orderUpdates,
    deliveryUpdates,
    chatMessages,
    presenceUpdates,

    // Actions
    sendNotification,
    updateOrderStatus,
    updateDeliveryStatus,
    sendChatMessage,
    joinChatRoom,
    leaveChatRoom,
    updateLocation,
    switchRole,
    applyForRole,
    markNotificationAsRead,

    // Utilities
    clearUpdates,
    clearNotifications,
    getUnreadNotificationsCount,
    getActiveDeliveries,
    getPendingOrders,
    getOnlineUsers,

    // WebSocket service for advanced usage
    webSocketService
  };
};

export default useRealTimeUpdates;