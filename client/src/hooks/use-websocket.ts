
import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '../services/websocket';
import { useAuth } from './use-auth';

interface Order {
  id: string;
  status: string;
  timestamp: Date;
  [key: string]: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: Date;
  isRead: boolean;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  message: string;
  timestamp: Date;
}

// Order updates hook
export function useWebSocketOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleOrderUpdate = useCallback((data: any) => {
    const newOrder: Order = {
      id: data.orderId,
      status: data.status,
      timestamp: new Date(),
      ...data
    };

    setOrders(prev => {
      const existing = prev.find(o => o.id === newOrder.id);
      if (existing) {
        return prev.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o);
      }
      return [newOrder, ...prev].slice(0, 50); // Keep last 50 orders
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !user) return;

    const connect = async () => {
      try {
        await webSocketService.connect({
          url: window.location.origin,
          auth: { token: 'temp-token' } // TODO: Get real token
        });
        setIsConnected(true);

        // Subscribe to order events
        webSocketService.on('order:status_changed', handleOrderUpdate);
        webSocketService.on('order_update', handleOrderUpdate);
      } catch (error) {
        console.error('Failed to connect WebSocket for orders:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      webSocketService.off('order:status_changed', handleOrderUpdate);
      webSocketService.off('order_update', handleOrderUpdate);
    };
  }, [user, isAuthenticated, handleOrderUpdate]);

  const updateOrderStatus = useCallback((orderId: string, status: string, updates: any = {}) => {
    webSocketService.updateOrderStatus({ orderId, status, updates });
  }, []);

  return { orders, isConnected, updateOrderStatus };
}

// Notifications hook
export function useWebSocketNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleNotification = useCallback((data: any) => {
    const notification: Notification = {
      id: data.id || Date.now().toString(),
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date(),
      isRead: false
    };

    setNotifications(prev => [notification, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !user) return;

    const connect = async () => {
      try {
        await webSocketService.connect({
          url: window.location.origin,
          auth: { token: 'temp-token' }
        });
        setIsConnected(true);

        webSocketService.on('notification:received', handleNotification);
        webSocketService.on('notification', handleNotification);
      } catch (error) {
        console.error('Failed to connect WebSocket for notifications:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      webSocketService.off('notification:received', handleNotification);
      webSocketService.off('notification', handleNotification);
    };
  }, [user, isAuthenticated, handleNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    webSocketService.markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const sendNotification = useCallback((data: {
    targetUserId: number;
    type: string;
    title: string;
    message: string;
  }) => {
    webSocketService.sendNotification(data);
  }, []);

  return { notifications, isConnected, markAsRead, sendNotification };
}

// Chat hook
export function useWebSocketChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const handleMessage = useCallback((data: any) => {
    const message: ChatMessage = {
      id: data.id || Date.now().toString(),
      roomId: data.roomId,
      senderId: data.senderId,
      senderName: data.senderName,
      message: data.message,
      timestamp: new Date()
    };

    setMessages(prev => [message, ...prev].slice(0, 200));
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !user) return;

    const connect = async () => {
      try {
        await webSocketService.connect({
          url: window.location.origin,
          auth: { token: 'temp-token' }
        });
        setIsConnected(true);

        webSocketService.on('chat:message_received', handleMessage);
        webSocketService.on('new_message', handleMessage);
      } catch (error) {
        console.error('Failed to connect WebSocket for chat:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      webSocketService.off('chat:message_received', handleMessage);
      webSocketService.off('new_message', handleMessage);
    };
  }, [user, isAuthenticated, handleMessage]);

  const sendMessage = useCallback((message: string, roomId?: string) => {
    const targetRoom = roomId || currentRoom;
    if (!targetRoom) return;

    webSocketService.sendChatMessage({
      roomId: targetRoom,
      message,
      messageType: 'TEXT'
    });
  }, [currentRoom]);

  const joinRoom = useCallback((roomId: string, roomType: string = 'general') => {
    webSocketService.joinChatRoom({ roomId, roomType });
    setCurrentRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    webSocketService.leaveChatRoom({ roomId });
    if (currentRoom === roomId) {
      setCurrentRoom(null);
    }
  }, [currentRoom]);

  return { messages, isConnected, currentRoom, sendMessage, joinRoom, leaveRoom };
}

// Driver tracking hook
export function useWebSocketDriverTracking() {
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) return;

    const connect = async () => {
      try {
        await webSocketService.connect({
          url: window.location.origin,
          auth: { token: 'temp-token' }
        });
        setIsConnected(true);

        webSocketService.on('driver_location', (data) => {
          setDriverLocation(data);
        });

        webSocketService.on('delivery:location_update', (data) => {
          setDriverLocation(data);
        });
      } catch (error) {
        console.error('Failed to connect WebSocket for driver tracking:', error);
      }
    };

    connect();
  }, [isAuthenticated]);

  const subscribeToTracking = useCallback((orderId: string) => {
    webSocketService.subscribeToDriverTracking(orderId);
  }, []);

  const updateDriverLocation = useCallback((data: {
    orderId: string;
    latitude: number;
    longitude: number;
  }) => {
    webSocketService.broadcastDriverLocation(data);
  }, []);

  return { driverLocation, isConnected, subscribeToTracking, updateDriverLocation };
}

// Payment updates hook
export function useWebSocketPayments() {
  const [paymentUpdates, setPaymentUpdates] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) return;

    const connect = async () => {
      try {
        await webSocketService.connect({
          url: window.location.origin,
          auth: { token: 'temp-token' }
        });
        setIsConnected(true);

        webSocketService.on('payment_status_update', (data) => {
          setPaymentUpdates(prev => [data, ...prev].slice(0, 50));
        });

        webSocketService.on('escrow_created', (data) => {
          setPaymentUpdates(prev => [{ type: 'escrow_created', ...data }, ...prev].slice(0, 50));
        });

        webSocketService.on('escrow_released', (data) => {
          setPaymentUpdates(prev => [{ type: 'escrow_released', ...data }, ...prev].slice(0, 50));
        });
      } catch (error) {
        console.error('Failed to connect WebSocket for payments:', error);
      }
    };

    connect();
  }, [isAuthenticated]);

  return { paymentUpdates, isConnected };
}
