
import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url?: string;
  auth?: {
    token: string;
  };
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface EventCallback {
  (...args: any[]): void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private connected = false;
  private authenticated = false;
  private eventCallbacks = new Map<string, EventCallback[]>();
  private config: WebSocketConfig = {};

  async connect(config: WebSocketConfig): Promise<void> {
    this.config = config;
    const socketUrl = config.url || window.location.origin;

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: config.reconnection !== false,
      reconnectionAttempts: config.reconnectionAttempts || 5,
      reconnectionDelay: config.reconnectionDelay || 1000,
      autoConnect: true,
      forceNew: true
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create socket'));
        return;
      }

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id);
        this.connected = true;
        
        // Authenticate if token provided
        if (config.auth?.token) {
          this.authenticate(config.auth.token);
        }
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.connected = false;
        this.authenticated = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('auth:success', (data) => {
        console.log('WebSocket authenticated successfully:', data);
        this.authenticated = true;
        this.emit('authenticated', data);
      });

      this.socket.on('auth:error', (data) => {
        console.error('WebSocket authentication failed:', data);
        this.authenticated = false;
        this.emit('auth_error', data);
      });

      // Setup all event listeners
      this.setupEventListeners();
    });
  }

  private authenticate(token: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('authenticate', { token });
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Real-time order updates
    this.socket.on('order:status_changed', (data) => {
      this.emit('order:status_changed', data);
    });

    this.socket.on('order_update', (data) => {
      this.emit('order_update', data);
    });

    // Real-time notifications
    this.socket.on('notification:received', (data) => {
      this.emit('notification:received', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    // Real-time delivery updates
    this.socket.on('delivery:status_changed', (data) => {
      this.emit('delivery:status_changed', data);
    });

    this.socket.on('delivery:location_update', (data) => {
      this.emit('delivery:location_update', data);
    });

    this.socket.on('driver_location', (data) => {
      this.emit('driver_location', data);
    });

    // Real-time chat
    this.socket.on('chat:message_received', (data) => {
      this.emit('chat:message_received', data);
    });

    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('chat:user_joined', (data) => {
      this.emit('chat:user_joined', data);
    });

    this.socket.on('chat:user_left', (data) => {
      this.emit('chat:user_left', data);
    });

    this.socket.on('chat:typing_indicator', (data) => {
      this.emit('chat:typing_indicator', data);
    });

    // Real-time presence
    this.socket.on('presence:update', (data) => {
      this.emit('presence:update', data);
    });

    // Real-time location updates
    this.socket.on('location:update', (data) => {
      this.emit('location:update', data);
    });

    // Real-time payment updates
    this.socket.on('payment_status_update', (data) => {
      this.emit('payment_status_update', data);
    });

    // Real-time escrow updates
    this.socket.on('escrow_created', (data) => {
      this.emit('escrow_created', data);
    });

    this.socket.on('escrow_released', (data) => {
      this.emit('escrow_released', data);
    });

    // Admin real-time updates
    this.socket.on('user_status_update', (data) => {
      this.emit('user_status_update', data);
    });

    this.socket.on('transaction_created', (data) => {
      this.emit('transaction_created', data);
    });

    this.socket.on('system_metrics_update', (data) => {
      this.emit('system_metrics_update', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  // Event management
  on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)?.push(callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventCallbacks.delete(event);
      return;
    }

    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Real-time actions
  sendNotification(data: {
    targetUserId: number;
    type: string;
    title: string;
    message: string;
    priority?: string;
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('notification:send', data);
    }
  }

  updateOrderStatus(data: {
    orderId: string;
    status: string;
    updates: any;
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('order:status_update', data);
    }
  }

  updateDeliveryStatus(data: {
    deliveryId: string;
    status: string;
    location?: any;
    estimatedTime?: string;
    proof?: any;
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('delivery:status_update', data);
    }
  }

  sendChatMessage(data: {
    roomId: string;
    message: string;
    messageType?: string;
    attachments?: any[];
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('chat:message', data);
    }
  }

  joinChatRoom(data: { roomId: string; roomType: string }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('chat:join_room', data);
    }
  }

  leaveChatRoom(data: { roomId: string }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('chat:leave_room', data);
    }
  }

  updateLocation(data: {
    latitude: number;
    longitude: number;
    trackingType: string;
    sharingLevel: string;
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('location:update', data);
    }
  }

  switchRole(targetRole: string): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('role:switch', { targetRole });
    }
  }

  applyForRole(data: { targetRole: string; applicationData: any }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('role:apply', data);
    }
  }

  markNotificationAsRead(notificationId: string): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('notification:read', { notificationId });
    }
  }

  joinOrderRoom(orderId: string): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('join_order_room', orderId);
    }
  }

  joinDeliveryRoom(deliveryId: string): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('join_delivery_room', deliveryId);
    }
  }

  subscribeToDriverTracking(orderId: string): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('subscribe_driver_tracking', orderId);
    }
  }

  broadcastDriverLocation(data: {
    orderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }): void {
    if (this.socket && this.authenticated) {
      this.socket.emit('broadcast_driver_location', data);
    }
  }

  // Getters
  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const webSocketService = new WebSocketService();
