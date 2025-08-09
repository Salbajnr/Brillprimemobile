
import { useEffect, useRef, useState } from 'react';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private currentAttempts: number = 0;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.reconnectInterval = config.reconnectInterval || 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.currentAttempts = 0;
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(listener => listener(message.payload));
    }
  }

  private attemptReconnect() {
    if (this.currentAttempts < this.maxReconnectAttempts) {
      this.currentAttempts++;
      console.log(`Attempting to reconnect... (${this.currentAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  unsubscribe(type: string, callback: (data: any) => void) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(callback);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export function useWebSocket(config: WebSocketConfig) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    clientRef.current = new WebSocketClient(config);
    
    clientRef.current.connect()
      .then(() => setConnected(true))
      .catch(console.error);

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [config.url]);

  return {
    client: clientRef.current,
    connected,
    send: (message: WebSocketMessage) => clientRef.current?.send(message),
    subscribe: (type: string, callback: (data: any) => void) => 
      clientRef.current?.subscribe(type, callback),
    unsubscribe: (type: string, callback: (data: any) => void) => 
      clientRef.current?.unsubscribe(type, callback)
  };
}
