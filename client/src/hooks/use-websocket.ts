import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { ClientRole, MessageType } from '../../../server/websocket';

// Define the structure for WebSocket messages
interface WebSocketMessage {
  type: MessageType;
  senderId: string;
  senderRole: ClientRole;
  recipientId?: string;
  recipientRole?: ClientRole;
  payload: any;
  timestamp: number;
}

// Define the return type for the hook
interface UseWebSocketReturn {
  connected: boolean;
  sendMessage: (message: Omit<WebSocketMessage, 'senderId' | 'senderRole' | 'timestamp'>) => void;
  lastMessage: WebSocketMessage | null;
  connectionError: string | null;
}

/**
 * Custom hook for WebSocket communication
 * @returns WebSocket connection state and methods
 */
export function useWebSocket(): UseWebSocketReturn {
  const { user } = useAuth();
  const [connected, setConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Use a ref to keep the WebSocket instance
  const socketRef = useRef<WebSocket | null>(null);
  
  // Determine the WebSocket URL based on the current environment
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    // Use port 5000 for WebSocket connection
    return `${protocol}//${hostname}:5000`;
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user || !user.id || !user.role) {
      return;
    }
    
    // Create WebSocket connection
    const wsUrl = getWebSocketUrl();
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setConnected(true);
      setConnectionError(null);
      
      // Send authentication message
      const authMessage: WebSocketMessage = {
        type: MessageType.CONNECTION_ACK,
        senderId: String(user.id),
        senderRole: user.role as ClientRole,
        payload: { userId: user.id, role: user.role },
        timestamp: Date.now()
      };
      
      socket.send(JSON.stringify(authMessage));
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(message);
        
        // Handle different message types if needed
        switch (message.type) {
          case MessageType.CONNECTION_ACK:
            console.log('Connection acknowledged by server');
            break;
          case MessageType.ERROR:
            console.error('WebSocket error:', message.payload.error);
            break;
          default:
            // Process other message types as needed
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      setConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
      }, 3000);
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setConnectionError('Failed to connect to the server');
      setConnected(false);
    });
    
    // Cleanup on unmount
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [user, getWebSocketUrl]);
  
  // Function to send messages
  const sendMessage = useCallback(
    (message: Omit<WebSocketMessage, 'senderId' | 'senderRole' | 'timestamp'>) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !user) {
        console.error('Cannot send message: WebSocket not connected');
        return;
      }
      
      const fullMessage: WebSocketMessage = {
        ...message,
        senderId: String(user.id),
        senderRole: user.role as ClientRole,
        timestamp: Date.now()
      };
      
      socketRef.current.send(JSON.stringify(fullMessage));
    },
    [user]
  );
  
  // Setup ping interval to keep connection alive
  useEffect(() => {
    if (!connected) return;
    
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user) {
        // Send a ping message
        const pingMessage = {
          type: 'PING',
          senderId: user.id,
          senderRole: user.role as ClientRole,
          payload: { timestamp: Date.now() },
          timestamp: Date.now()
        };
        socketRef.current.send(JSON.stringify(pingMessage));
      }
    }, 30000); // Send ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [connected, user]);
  
  return {
    connected,
    sendMessage,
    lastMessage,
    connectionError
  };
}

/**
 * Hook for chat functionality using WebSocket
 * @returns Chat-specific methods and state
 */
export function useWebSocketChat() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [chatMessages, setChatMessages] = useState<WebSocketMessage[]>([]);
  
  // Process incoming chat messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === MessageType.CHAT_MESSAGE) {
      setChatMessages((prevMessages: WebSocketMessage[]) => [...prevMessages, lastMessage]);
    }
  }, [lastMessage]);
  
  // Send a chat message
  const sendChatMessage = useCallback(
    (recipientId: string, recipientRole: ClientRole, content: string) => {
      sendMessage({
        type: MessageType.CHAT_MESSAGE,
        recipientId,
        recipientRole,
        payload: { content }
      });
    },
    [sendMessage]
  );
  
  return {
    connected,
    chatMessages,
    sendChatMessage,
    connectionError
  };
}

/**
 * Hook for location tracking using WebSocket
 * @returns Location tracking methods and state
 */
export function useWebSocketLocation() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  
  // Send location update
  const sendLocationUpdate = useCallback(
    (location: { latitude: number; longitude: number }, orderId?: string, notifyUserIds?: string[]) => {
      sendMessage({
        type: MessageType.LOCATION_UPDATE,
        payload: { location, orderId, notifyUserIds }
      });
    },
    [sendMessage]
  );
  
  // Get the latest location update for a specific order
  const [orderLocations, setOrderLocations] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (lastMessage && lastMessage.type === MessageType.LOCATION_UPDATE && lastMessage.payload.orderId) {
      const { orderId, location } = lastMessage.payload;
      setOrderLocations((prev: Record<string, any>) => ({
        ...prev,
        [orderId]: { ...location, timestamp: lastMessage.timestamp }
      }));
    }
  }, [lastMessage]);
  
  return {
    connected,
    sendLocationUpdate,
    orderLocations,
    connectionError
  };
}

/**
 * Hook for order status updates using WebSocket
 * @returns Order status methods and state
 */
export function useWebSocketOrders() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [orderUpdates, setOrderUpdates] = useState<Record<string, any>>({});
  
  // Process incoming order status updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === MessageType.ORDER_STATUS_UPDATE && lastMessage.payload.orderId) {
      const { orderId, status } = lastMessage.payload;
      setOrderUpdates((prev: Record<string, any>) => ({
        ...prev,
        [orderId]: { status, timestamp: lastMessage.timestamp, updatedBy: lastMessage.senderId }
      }));
    }
  }, [lastMessage]);
  
  // Send order status update
  const sendOrderStatusUpdate = useCallback(
    (orderId: string, status: string, recipientIds?: string[]) => {
      sendMessage({
        type: MessageType.ORDER_STATUS_UPDATE,
        payload: { orderId, status, recipientIds }
      });
    },
    [sendMessage]
  );
  
  return {
    connected,
    orderUpdates,
    sendOrderStatusUpdate,
    connectionError
  };
}

/**
 * Hook for notifications using WebSocket
 * @returns Notification methods and state
 */
export function useWebSocketNotifications() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [notifications, setNotifications] = useState<WebSocketMessage[]>([]);
  
  // Process incoming notifications
  useEffect(() => {
    if (lastMessage && lastMessage.type === MessageType.NOTIFICATION) {
      setNotifications((prev: WebSocketMessage[]) => [lastMessage, ...prev]);
    }
  }, [lastMessage]);
  
  // Send a notification
  const sendNotification = useCallback(
    (recipientId: string, recipientRole: ClientRole, content: any) => {
      sendMessage({
        type: MessageType.NOTIFICATION,
        recipientId,
        recipientRole,
        payload: content
      });
    },
    [sendMessage]
  );
  
  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  return {
    connected,
    notifications,
    sendNotification,
    clearNotifications,
    connectionError
  };
}

/**
 * Hook for payment status updates using WebSocket
 * @returns Payment status methods and state
 */
export function useWebSocketPayments() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [paymentUpdates, setPaymentUpdates] = useState<Record<string, any>>({});
  const [walletBalance, setWalletBalance] = useState<string>('0.00');
  
  // Process payment status updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'payment_status_update') {
        const { transaction, type } = lastMessage.payload;
        setPaymentUpdates((prev: Record<string, any>) => ({
          ...prev,
          [transaction?.id || Date.now()]: {
            type,
            transaction,
            timestamp: lastMessage.timestamp
          }
        }));
      }
      
      if (lastMessage.type === 'wallet_balance_update') {
        const { balance } = lastMessage.payload;
        setWalletBalance(balance);
      }
    }
  }, [lastMessage]);
  
  // Subscribe to payment updates
  const subscribeToPaymentUpdates = useCallback((userId: number) => {
    if (connected) {
      sendMessage({
        type: 'subscribe_payment_updates' as any,
        payload: { userId }
      });
    }
  }, [connected, sendMessage]);
  
  // Check payment status
  const checkPaymentStatus = useCallback((reference: string) => {
    if (connected) {
      sendMessage({
        type: 'payment_status_check' as any,
        payload: { reference }
      });
    }
  }, [connected, sendMessage]);
  
  return {
    connected,
    paymentUpdates,
    walletBalance,
    subscribeToPaymentUpdates,
    checkPaymentStatus,
    connectionError
  };
}

/**
 * Hook for live driver tracking using WebSocket
 * @returns Driver tracking methods and state
 */
export function useWebSocketDriverTracking() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [driverLocations, setDriverLocations] = useState<Record<string, any>>({});
  const [etaUpdates, setEtaUpdates] = useState<Record<string, any>>({});
  
  // Process driver tracking updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'driver_location_update') {
        const { orderId, driverLocation, eta, distance } = lastMessage.payload;
        setDriverLocations((prev: Record<string, any>) => ({
          ...prev,
          [orderId]: {
            location: driverLocation,
            eta,
            distance,
            timestamp: lastMessage.timestamp
          }
        }));
      }
      
      if (lastMessage.type === 'delivery_eta_update') {
        const { orderId, eta, distance, driverLocation } = lastMessage.payload;
        setEtaUpdates((prev: Record<string, any>) => ({
          ...prev,
          [orderId]: {
            eta,
            distance,
            driverLocation,
            timestamp: lastMessage.timestamp
          }
        }));
      }

      if (lastMessage.type === 'driver_position_update') {
        const { driverId, position } = lastMessage.payload;
        setDriverLocations((prev: Record<string, any>) => ({
          ...prev,
          [`driver_${driverId}`]: {
            location: position,
            timestamp: lastMessage.timestamp
          }
        }));
      }
    }
  }, [lastMessage]);
  
  // Subscribe to driver tracking for an order
  const subscribeToDriverTracking = useCallback((orderId: string) => {
    if (connected) {
      sendMessage({
        type: 'subscribe_driver_tracking' as any,
        payload: { orderId }
      });
    }
  }, [connected, sendMessage]);
  
  // Broadcast driver location (for drivers)
  const broadcastDriverLocation = useCallback((data: {
    orderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) => {
    if (connected) {
      sendMessage({
        type: 'broadcast_driver_location' as any,
        payload: data
      });
    }
  }, [connected, sendMessage]);
  
  // Calculate ETA
  const calculateETA = useCallback((data: {
    orderId: string;
    driverLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  }) => {
    if (connected) {
      sendMessage({
        type: 'calculate_eta' as any,
        payload: data
      });
    }
  }, [connected, sendMessage]);
  
  // Join live map
  const joinLiveMap = useCallback(() => {
    if (connected) {
      sendMessage({
        type: 'join_live_map' as any,
        payload: {}
      });
    }
  }, [connected, sendMessage]);
  
  return {
    connected,
    driverLocations,
    etaUpdates,
    subscribeToDriverTracking,
    broadcastDriverLocation,
    calculateETA,
    joinLiveMap,
    connectionError
  };
}

/**
 * Hook for delivery status updates using WebSocket
 * @returns Delivery status methods and state
 */
export function useWebSocketDeliveryStatus() {
  const { connected, sendMessage, lastMessage, connectionError } = useWebSocket();
  const [deliveryUpdates, setDeliveryUpdates] = useState<Record<string, any>>({});
  
  // Process incoming delivery status updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === MessageType.DELIVERY_STATUS && lastMessage.payload.deliveryId) {
      const { deliveryId, status, location, estimatedTime } = lastMessage.payload;
      setDeliveryUpdates((prev: Record<string, any>) => ({
        ...prev,
        [deliveryId]: { 
          status, 
          location, 
          estimatedTime,
          timestamp: lastMessage.timestamp, 
          updatedBy: lastMessage.senderId 
        }
      }));
    }
  }, [lastMessage]);
  
  // Send delivery status update
  const sendDeliveryStatusUpdate = useCallback(
    (deliveryId: string, status: string, location?: { latitude: number; longitude: number }, estimatedTime?: number, recipientIds?: string[]) => {
      sendMessage({
        type: MessageType.DELIVERY_STATUS,
        payload: { deliveryId, status, location, estimatedTime, recipientIds }
      });
    },
    [sendMessage]
  );
  
  return {
    connected,
    deliveryUpdates,
    sendDeliveryStatusUpdate,
    connectionError
  };
}