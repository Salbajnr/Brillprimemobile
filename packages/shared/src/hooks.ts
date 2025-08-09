
// Cross-platform hooks using React
import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthState, Order, Notification } from './types';
import { ApiClient } from './api';

// Storage abstraction for cross-platform compatibility
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Auth Hook
export function useAuth(apiClient: ApiClient, storage: StorageAdapter) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.post<{
        user: User;
        token: string;
      }>('/api/auth/login', { email, password });

      const { user, token } = response;
      
      await storage.setItem('auth_token', token);
      await storage.setItem('user', JSON.stringify(user));
      
      apiClient.setToken(token);
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }, [apiClient, storage]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    
    await storage.removeItem('auth_token');
    await storage.removeItem('user');
    
    apiClient.setToken(null);
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [apiClient, storage]);

  const initializeAuth = useCallback(async () => {
    try {
      const token = await storage.getItem('auth_token');
      const userJson = await storage.getItem('user');
      
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        apiClient.setToken(token);
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [apiClient, storage]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    ...authState,
    login,
    logout,
    initializeAuth,
  };
}

// WebSocket Hook
export function useWebSocket(url: string, token: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token) return;

    try {
      const ws = new WebSocket(`${url}?token=${token}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSocket(null);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 1000 * reconnectAttempts.current);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, token]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
    disconnect,
  };
}

// Generic API Hook
export function useApi<T>(
  apiClient: ApiClient,
  endpoint: string,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<T>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiClient, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Orders Hook
export function useOrders(apiClient: ApiClient) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<Order[]>('/api/orders');
      setOrders(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const createOrder = useCallback(async (orderData: Partial<Order>) => {
    try {
      const newOrder = await apiClient.post<Order>('/api/orders', orderData);
      setOrders(prev => [newOrder, ...prev]);
      return { success: true, order: newOrder };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create order' 
      };
    }
  }, [apiClient]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
  };
}

// Notifications Hook
export function useNotifications(apiClient: ApiClient) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await apiClient.get<Notification[]>('/api/notifications');
      setNotifications(result);
      setUnreadCount(result.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [apiClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
  };
}
