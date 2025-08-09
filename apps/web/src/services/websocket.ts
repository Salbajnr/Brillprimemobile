import { io, Socket } from 'socket.io-client';
import React from 'react';

interface WebSocketConfig {
  url: string;
  auth?: {
    token: string;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface WebSocketEvents {
  // Authentication events
  'auth:success': (data: { userId: number; role: string; socketId: string }) => void;
  'auth:error': (data: { message: string }) => void;
  
  // Role management events
  'role:application_submitted': (application: any) => void;
  'role:application_error': (data: { error: string }) => void;
  'role:switched': (data: { newRole: string }) => void;
  'role:switch_error': (data: { error: string }) => void;
  'role:new_application': (data: { application: any; applicant: User }) => void;
  
  // Location events
  'location:updated': (location: any) => void;
  'location:error': (data: { error: string }) => void;
  'location:update': (data: any) => void;
  
  // Notification events
  'notification:sent': (notification: any) => void;
  'notification:received': (notification: any) => void;
  'notification:marked_read': (data: { notificationId: string }) => void;
  'notification:error': (data: { error: string }) => void;
  
  // Order events
  'order:status_changed': (data: any) => void;
  'order:update_sent': (data: { orderId: string; status: string }) => void;
  'order:error': (data: { error: string }) => void;
  
  // Delivery events
  'delivery:status_changed': (data: any) => void;
  'delivery:location_update': (data: any) => void;
  'delivery:update_sent': (data: { deliveryId: string; status: string }) => void;
  'delivery:error': (data: { error: string }) => void;
  
  // Chat events
  'chat:joined': (data: { roomId: string; roomType: string }) => void;
  'chat:left': (data: { roomId: string }) => void;
  'chat:user_joined': (data: { userId: number; userName: string; userRole: string; timestamp: Date }) => void;
  'chat:user_left': (data: { userId: number; userName: string; timestamp: Date }) => void;
  'chat:message_received': (message: any) => void;
  'chat:typing_indicator': (data: { userId: number; userName: string; isTyping: boolean; timestamp: Date }) => void;
  'chat:error': (data: { error: string }) => void;
  
  // System events
  'system:heartbeat_ack': (data: { timestamp: Date }) => void;
  'presence:update': (data: { userId: number; status: string; role?: string; activity?: string; timestamp: Date }) => void;
  
  // Error events
  'error': (data: { message: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupEventListeners();
  }

  connect(config: WebSocketConfig): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = io(config.url, {
        transports: ['websocket', 'polling'],
        auth: config.auth,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Authenticate if token is provided
        if (config.auth?.token) {
          this.socket?.emit('authenticate', { token: config.auth.token });
        }
        
        resolve(this.socket!);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnected = false;
        this.handleReconnection(config);
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      // Setup event forwarding
      this.setupEventForwarding();
    });
  }

  private setupEventForwarding() {
    if (!this.socket) return;

    // Forward all events to registered listeners
    const events = [
      'auth:success', 'auth:error',
      'role:application_submitted', 'role:application_error', 'role:switched', 'role:switch_error', 'role:new_application',
      'location:updated', 'location:error', 'location:update',
      'notification:sent', 'notification:received', 'notification:marked_read', 'notification:error',
      'order:status_changed', 'order:update_sent', 'order:error',
      'delivery:status_changed', 'delivery:location_update', 'delivery:update_sent', 'delivery:error',
      'chat:joined', 'chat:left', 'chat:user_joined', 'chat:user_left', 'chat:message_received', 'chat:typing_indicator', 'chat:error',
      'system:heartbeat_ack', 'presence:update',
      'error'
    ];

    events.forEach(event => {
      this.socket?.on(event, (data: any) => {
        this.emit(event, data);
      });
    });
  }

  private handleReconnection(config: WebSocketConfig) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(config).catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listeners management
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Role Management
  applyForRole(data: { targetRole: string; applicationData: any }) {
    this.socket?.emit('role:apply', data);
  }

  switchRole(targetRole: string) {
    this.socket?.emit('role:switch', { targetRole });
  }

  // Location Services
  updateLocation(data: { latitude: number; longitude: number; trackingType: string; sharingLevel: string }) {
    this.socket?.emit('location:update', data);
  }

  // Notifications
  sendNotification(data: { targetUserId: number; type: string; title: string; message: string; priority?: string }) {
    this.socket?.emit('notification:send', data);
  }

  markNotificationAsRead(notificationId: string) {
    this.socket?.emit('notification:read', { notificationId });
  }

  // Order Management
  updateOrderStatus(data: { orderId: string; status: string; updates: any }) {
    this.socket?.emit('order:status_update', data);
  }

  joinOrderRoom(orderId: string) {
    this.socket?.emit('join', `order_${orderId}`);
  }

  leaveOrderRoom(orderId: string) {
    this.socket?.emit('leave', `order_${orderId}`);
  }

  // Delivery Management
  updateDeliveryStatus(data: { deliveryId: string; status: string; location?: any; estimatedTime?: string; proof?: any }) {
    this.socket?.emit('delivery:status_update', data);
  }

  shareDeliveryLocation(data: { deliveryId: string; location: { latitude: number; longitude: number } }) {
    this.socket?.emit('delivery:location_share', data);
  }

  joinDeliveryRoom(deliveryId: string) {
    this.socket?.emit('join', `delivery_${deliveryId}`);
  }

  leaveDeliveryRoom(deliveryId: string) {
    this.socket?.emit('leave', `delivery_${deliveryId}`);
  }

  // Chat Services
  joinChatRoom(data: { roomId: string; roomType: string }) {
    this.socket?.emit('chat:join_room', data);
  }

  leaveChatRoom(data: { roomId: string }) {
    this.socket?.emit('chat:leave_room', data);
  }

  sendChatMessage(data: { roomId: string; message: string; messageType?: string; attachments?: any[] }) {
    this.socket?.emit('chat:message', data);
  }

  sendTypingIndicator(data: { roomId: string; isTyping: boolean }) {
    this.socket?.emit('chat:typing', data);
  }

  // Analytics
  trackEvent(data: { action: string; category: string; label?: string; value?: number; metadata?: any }) {
    this.socket?.emit('analytics:track', data);
  }

  trackInteraction(data: { targetId: number; targetRole: string; interactionType: string; relatedOrderId?: string; relatedChatId?: string }) {
    this.socket?.emit('analytics:interaction', data);
  }

  // System
  sendHeartbeat() {
    this.socket?.emit('system:heartbeat');
  }

  updatePresence(data: { status: string; activity?: string }) {
    this.socket?.emit('system:presence', data);
  }

  // Utility methods
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  get socketId() {
    return this.socket?.id;
  }

  private setupEventListeners() {
    // Setup heartbeat interval
    setInterval(() => {
      if (this.connected) {
        this.sendHeartbeat();
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Setup presence updates
    document.addEventListener('visibilitychange', () => {
      if (this.connected) {
        this.updatePresence({
          status: document.hidden ? 'away' : 'online',
          activity: document.hidden ? 'inactive' : 'active'
        });
      }
    });
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// React hooks for WebSocket
export const useWebSocket = () => {
  const [connected, setConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setSocketId(webSocketService.socketId || null);
    };

    const handleDisconnect = () => {
      setConnected(false);
      setSocketId(null);
    };

    webSocketService.on('auth:success', handleConnect);
    webSocketService.on('error', handleDisconnect);

    return () => {
      webSocketService.off('auth:success', handleConnect);
      webSocketService.off('error', handleDisconnect);
    };
  }, []);

  return {
    connected,
    socketId,
    service: webSocketService
  };
};

export default webSocketService;