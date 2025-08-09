// API service for native app - mirrors the web implementation
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, User, UserRole } from '../types';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          // Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async signUp(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post('/api/auth/signup', userData);
    return response.data;
  }

  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post('/api/auth/signin', credentials);
    
    if (response.data.success && response.data.data) {
      // Store token and user data
      await AsyncStorage.setItem('auth_token', response.data.data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  }

  async verifyOTP(data: {
    email: string;
    otp: string;
    purpose: 'signup' | 'reset';
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/verify-otp', data);
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(data: {
    token: string;
    password: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/reset-password', data);
    return response.data;
  }

  async signOut(): Promise<void> {
    try {
      await this.client.post('/api/auth/signout');
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
  }

  // User endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get('/api/user/profile');
    return response.data;
  }

  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.client.patch('/api/user/profile', updates);
    return response.data;
  }

  // Order endpoints
  async getOrders(page = 1, limit = 20): Promise<ApiResponse> {
    const response = await this.client.get(`/api/orders?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getOrderById(orderId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/orders/${orderId}`);
    return response.data;
  }

  async createOrder(orderData: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/orders', orderData);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string, data?: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/orders/${orderId}/status`, { status, ...data });
    return response.data;
  }

  // Wallet endpoints
  async getWallet(): Promise<ApiResponse> {
    const response = await this.client.get('/api/wallet');
    return response.data;
  }

  async fundWallet(amount: number, paymentMethod: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/wallet/fund', { amount, paymentMethod });
    return response.data;
  }

  async getTransactions(page = 1, limit = 20): Promise<ApiResponse> {
    const response = await this.client.get(`/api/transactions?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Payment endpoints
  async initiatePayment(data: {
    orderId: string;
    amount: number;
    paymentMethod: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/payments/initiate', data);
    return response.data;
  }

  async verifyPayment(reference: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/payments/verify', { reference });
    return response.data;
  }

  // Notification endpoints
  async getNotifications(page = 1, limit = 20): Promise<ApiResponse> {
    const response = await this.client.get(`/api/notifications?page=${page}&limit=${limit}`);
    return response.data;
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    const response = await this.client.patch('/api/notifications/read-all');
    return response.data;
  }

  // Chat endpoints
  async getChatRooms(): Promise<ApiResponse> {
    const response = await this.client.get('/api/chat/rooms');
    return response.data;
  }

  async getChatMessages(roomId: string, page = 1, limit = 50): Promise<ApiResponse> {
    const response = await this.client.get(`/api/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`);
    return response.data;
  }

  async sendChatMessage(roomId: string, message: string, type = 'TEXT'): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/rooms/${roomId}/messages`, {
      message,
      messageType: type
    });
    return response.data;
  }

  // Location endpoints
  async updateLocation(data: {
    latitude: number;
    longitude: number;
    trackingType: string;
    sharingLevel: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/location/update', data);
    return response.data;
  }

  async getNearbyDrivers(latitude: number, longitude: number, radius = 5): Promise<ApiResponse> {
    const response = await this.client.get(`/api/location/nearby-drivers?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    return response.data;
  }

  // Driver-specific endpoints
  async getDriverDeliveries(): Promise<ApiResponse> {
    const response = await this.client.get('/api/driver/deliveries');
    return response.data;
  }

  async acceptDelivery(deliveryId: string): Promise<ApiResponse> {
    const response = await this.client.post(`/api/driver/deliveries/${deliveryId}/accept`);
    return response.data;
  }

  async updateDeliveryStatus(deliveryId: string, status: string, location?: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/driver/deliveries/${deliveryId}/status`, {
      status,
      location
    });
    return response.data;
  }

  // Merchant-specific endpoints
  async getMerchantOrders(): Promise<ApiResponse> {
    const response = await this.client.get('/api/merchant/orders');
    return response.data;
  }

  async updateMerchantProfile(data: any): Promise<ApiResponse> {
    const response = await this.client.patch('/api/merchant/profile', data);
    return response.data;
  }

  async getMerchantAnalytics(period = '7d'): Promise<ApiResponse> {
    const response = await this.client.get(`/api/merchant/analytics?period=${period}`);
    return response.data;
  }

  // Fuel ordering endpoints
  async getFuelStations(latitude: number, longitude: number): Promise<ApiResponse> {
    const response = await this.client.get(`/api/fuel/stations?lat=${latitude}&lng=${longitude}`);
    return response.data;
  }

  async createFuelOrder(data: {
    stationId: string;
    fuelType: string;
    quantity: number;
    deliveryAddress: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/fuel/orders', data);
    return response.data;
  }

  // Toll payment endpoints
  async getTollStations(): Promise<ApiResponse> {
    const response = await this.client.get('/api/toll/stations');
    return response.data;
  }

  async payToll(data: {
    stationId: string;
    vehicleClass: string;
    amount: number;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/toll/pay', data);
    return response.data;
  }

  // File upload
  async uploadFile(file: FormData, type: 'image' | 'document'): Promise<ApiResponse> {
    const response = await this.client.post(`/api/upload/${type}`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Configuration from environment
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
  timeout: 30000,
};

export const apiService = new ApiService(API_CONFIG.baseURL);
export default apiService;