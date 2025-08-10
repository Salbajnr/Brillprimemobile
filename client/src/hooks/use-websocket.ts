
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth-simple';

interface WebSocketHookReturn {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export function useWebSocket(): WebSocketHookReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.PROD 
      ? window.location.origin 
      : 'http://localhost:5000';

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // Join user-specific room for notifications
      newSocket.emit('join_user_room', user.id);
      
      // Join role-specific rooms
      if (user.role === 'ADMIN') {
        newSocket.emit('join_admin_room', 'user_management');
        newSocket.emit('join_admin_room', 'transaction_monitoring');
        newSocket.emit('join_admin_room', 'kyc_verification');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Handle connection acknowledgment
    newSocket.on('CONNECTION_ACK', (data) => {
      console.log('Connection acknowledged:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const emit = (event: string, data?: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  return {
    socket,
    connected,
    emit,
    on,
    off,
  };
}

// Specialized hooks for specific real-time features
export function useOrderUpdates() {
  const { socket, connected, on, off } = useWebSocket();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;

    const handleOrderUpdate = (data: any) => {
      console.log('Order update received:', data);
      setOrders(prev => 
        prev.map(order => 
          order.id === data.orderId 
            ? { ...order, status: data.status, ...data } 
            : order
        )
      );
    };

    const handleNewOrder = (data: any) => {
      console.log('New order received:', data);
      setOrders(prev => [data, ...prev]);
    };

    on('order_update', handleOrderUpdate);
    on('new_order', handleNewOrder);

    return () => {
      off('order_update', handleOrderUpdate);
      off('new_order', handleNewOrder);
    };
  }, [connected, on, off]);

  return { orders, setOrders };
}

export function useDriverTracking(orderId?: string) {
  const { connected, on, off, emit } = useWebSocket();
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [eta, setEta] = useState<string>('');

  useEffect(() => {
    if (!connected || !orderId) return;

    // Subscribe to driver tracking for specific order
    emit('subscribe_driver_tracking', orderId);

    const handleLocationUpdate = (data: any) => {
      if (data.orderId === orderId) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          timestamp: data.timestamp,
        });
      }
    };

    const handleEtaUpdate = (data: any) => {
      if (data.orderId === orderId) {
        setEta(data.eta);
      }
    };

    on('driver_location_realtime', handleLocationUpdate);
    on('eta_updated', handleEtaUpdate);

    return () => {
      off('driver_location_realtime', handleLocationUpdate);
      off('eta_updated', handleEtaUpdate);
    };
  }, [connected, orderId, on, off, emit]);

  const updateDriverLocation = (location: { lat: number; lng: number }) => {
    if (orderId) {
      emit('broadcast_driver_location', {
        orderId,
        latitude: location.lat,
        longitude: location.lng,
      });
    }
  };

  return {
    driverLocation,
    eta,
    updateDriverLocation,
  };
}

export function useNotifications() {
  const { connected, on, off } = useWebSocket();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!connected) return;

    const handleNotification = (data: any) => {
      console.log('New notification:', data);
      setNotifications(prev => [data, ...prev]);
    };

    const handleOrderNotification = (data: any) => {
      console.log('Order notification:', data);
      setNotifications(prev => [
        {
          id: Date.now(),
          title: 'Order Update',
          message: data.message,
          type: data.type,
          isRead: false,
          createdAt: new Date().toISOString(),
          ...data,
        },
        ...prev,
      ]);
    };

    on('notification', handleNotification);
    on('order_notification', handleOrderNotification);

    return () => {
      off('notification', handleNotification);
      off('order_notification', handleOrderNotification);
    };
  }, [connected, on, off]);

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  return {
    notifications,
    markAsRead,
  };
}

export function useChat(conversationId?: string) {
  const { connected, on, off, emit } = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typing, setTyping] = useState<any[]>([]);

  useEffect(() => {
    if (!connected || !conversationId) return;

    // Join conversation room
    emit('join_conversation', conversationId);

    const handleNewMessage = (data: any) => {
      console.log('New message:', data);
      setMessages(prev => [...prev, data]);
    };

    const handleUserTyping = (data: any) => {
      setTyping(prev => [...prev.filter(t => t.userId !== data.userId), data]);
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTyping(prev => prev.filter(t => t.userId !== data.userId));
      }, 3000);
    };

    const handleUserStoppedTyping = (data: any) => {
      setTyping(prev => prev.filter(t => t.userId !== data.userId));
    };

    on('new_message', handleNewMessage);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      off('new_message', handleNewMessage);
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [connected, conversationId, on, off, emit]);

  const sendMessage = (content: string, messageType = 'TEXT') => {
    if (conversationId && connected) {
      emit('send_message', {
        conversationId,
        content,
        messageType,
      });
    }
  };

  const startTyping = (userId: number, userName: string) => {
    if (conversationId && connected) {
      emit('typing_start', {
        conversationId,
        userId,
        userName,
      });
    }
  };

  const stopTyping = (userId: number) => {
    if (conversationId && connected) {
      emit('typing_stop', {
        conversationId,
        userId,
      });
    }
  };

  return {
    messages,
    typing,
    sendMessage,
    startTyping,
    stopTyping,
  };
}

// Export additional hooks for backward compatibility with existing imports
export const useWebSocketOrders = useOrderUpdates;
export const useWebSocketNotifications = useNotifications;
export const useWebSocketChat = useChat;
