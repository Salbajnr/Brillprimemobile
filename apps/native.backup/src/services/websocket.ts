// WebSocket service for native app - mirrors the web implementation
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealTimeEvent } from '../types';

interface WebSocketConfig {
  url: string;
  auth?: {
    token: string;
  };
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (event: RealTimeEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isManualClose = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  async connect(config: WebSocketConfig, callbacks: WebSocketCallbacks = {}): Promise<void> {
    this.config = config;
    this.callbacks = callbacks;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectInterval = config.reconnectInterval || 3000;

    return new Promise((resolve, reject) => {
      try {
        // Get auth token from storage if not provided
        const connectWithAuth = async () => {
          let authToken = config.auth?.token;
          if (!authToken) {
            authToken = await AsyncStorage.getItem('auth_token');
          }

          const wsUrl = authToken 
            ? `${config.url}?token=${authToken}`
            : config.url;

          this.ws = new WebSocket(wsUrl);
          this.setupEventHandlers(resolve, reject);
        };

        connectWithAuth();
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers(resolve: () => void, reject: (error: any) => void) {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.isManualClose = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.callbacks.onConnect?.();
      resolve();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.callbacks.onDisconnect?.();

      if (!this.isManualClose && this.shouldReconnect()) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.callbacks.onError?.(error);
      if (this.reconnectAttempts === 0) {
        reject(error);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        switch (data.type) {
          case 'ping':
            this.send({ type: 'pong' });
            break;
          case 'pong':
            // Heartbeat response
            break;
          default:
            // Real-time event
            const realTimeEvent: RealTimeEvent = {
              type: data.type,
              data: data.data,
              timestamp: new Date(data.timestamp || Date.now()),
              userId: data.userId,
              roomId: data.roomId,
            };
            this.callbacks.onMessage?.(realTimeEvent);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      if (this.config && !this.isConnected) {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.callbacks.onReconnect?.(this.reconnectAttempts);
        this.connect(this.config, this.callbacks).catch(console.error);
      }
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(data: any): boolean {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  // Real-time event methods
  joinRoom(roomId: string, roomType: string): void {
    this.send({
      type: 'join_room',
      data: { roomId, roomType }
    });
  }

  leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      data: { roomId }
    });
  }

  sendChatMessage(data: {
    roomId: string;
    message: string;
    messageType?: string;
    attachments?: any[];
  }): void {
    this.send({
      type: 'chat_message',
      data
    });
  }

  updateLocation(data: {
    latitude: number;
    longitude: number;
    trackingType: string;
    sharingLevel: string;
  }): void {
    this.send({
      type: 'location_update',
      data
    });
  }

  subscribeToOrderUpdates(orderId: string): void {
    this.send({
      type: 'subscribe_order',
      data: { orderId }
    });
  }

  unsubscribeFromOrderUpdates(orderId: string): void {
    this.send({
      type: 'unsubscribe_order',
      data: { orderId }
    });
  }

  subscribeToDeliveryUpdates(driverId?: number): void {
    this.send({
      type: 'subscribe_delivery',
      data: { driverId }
    });
  }

  subscribeToNotifications(): void {
    this.send({
      type: 'subscribe_notifications',
      data: {}
    });
  }

  updateUserPresence(status: 'online' | 'offline' | 'busy' | 'away'): void {
    this.send({
      type: 'presence_update',
      data: { status }
    });
  }

  // Admin-specific methods
  subscribeToAdminEvents(): void {
    this.send({
      type: 'subscribe_admin',
      data: {}
    });
  }

  broadcastNotification(notification: {
    title: string;
    message: string;
    type: string;
    targetUsers?: number[];
    targetRoles?: string[];
  }): void {
    this.send({
      type: 'broadcast_notification',
      data: notification
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.config = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
  }

  getConnectionState(): {
    isConnected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }

  updateCallbacks(callbacks: Partial<WebSocketCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;