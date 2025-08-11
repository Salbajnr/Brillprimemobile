
import { ApiResponse } from '../shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the base URL from environment or use the Replit backend URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://0.0.0.0:5000';

class ApiService {
  private baseURL: string;
  private requestTimeout: number = 30000; // 30 seconds

  constructor() {
    this.baseURL = BASE_URL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const userSession = await AsyncStorage.getItem('userSession');
      if (userSession) {
        const session = JSON.parse(userSession);
        if (session.token) {
          headers['Authorization'] = `Bearer ${session.token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth headers:', error);
    }

    return headers;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    customHeaders: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}/api${endpoint}`;
      const authHeaders = await this.getAuthHeaders();
      
      const config: RequestInit = {
        method,
        headers: {
          ...authHeaders,
          ...customHeaders,
        },
        credentials: 'include',
        timeout: this.requestTimeout,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        if (data instanceof FormData) {
          // Remove Content-Type header for FormData to let fetch set it
          delete config.headers!['Content-Type'];
          config.body = data;
        } else {
          config.body = JSON.stringify(data);
        }
      }

      console.log(`🌐 API ${method} ${url}`, data ? { data } : '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      let result;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = { data: await response.text() };
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, result);
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      console.log(`✅ API Success ${response.status}:`, result);

      return {
        success: true,
        data: result.data || result,
      };
    } catch (error: any) {
      console.error(`💥 API ${method} ${endpoint} error:`, error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout - please check your connection',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  async patch<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, headers);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }

  // Authentication endpoints
  async signIn(credentials: { email: string; password: string }) {
    const response = await this.post('/auth/login', credentials);
    if (response.success && response.data) {
      // Store session data
      await AsyncStorage.setItem('userSession', JSON.stringify(response.data));
    }
    return response;
  }

  async signUp(userData: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }) {
    const response = await this.post('/auth/register', userData);
    if (response.success && response.data) {
      await AsyncStorage.setItem('userSession', JSON.stringify(response.data));
    }
    return response;
  }

  async signOut() {
    const response = await this.post('/auth/logout');
    // Clear local session regardless of server response
    await AsyncStorage.removeItem('userSession');
    return response;
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async verifyOTP(data: { email: string; otp: string }) {
    const response = await this.post('/auth/verify-otp', data);
    if (response.success && response.data) {
      await AsyncStorage.setItem('userSession', JSON.stringify(response.data));
    }
    return response;
  }

  async resendOTP(email: string) {
    return this.post('/auth/resend-otp', { email });
  }

  // Dashboard endpoints
  async getDashboard() {
    return this.get('/dashboard');
  }

  // User profile endpoints
  async getProfile() {
    return this.get('/user/profile');
  }

  async updateProfile(profileData: {
    fullName?: string;
    email?: string;
    phone?: string;
  }) {
    return this.put('/user/profile', profileData);
  }

  // Orders endpoints
  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const query = queryParams.toString();
    return this.get(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(orderId: string) {
    return this.get(`/orders/${orderId}`);
  }

  async createOrder(orderData: any) {
    return this.post('/orders', orderData);
  }

  async cancelOrder(orderId: string, reason?: string) {
    return this.put(`/orders/${orderId}/cancel`, { reason });
  }

  // Wallet endpoints
  async getWalletBalance() {
    return this.get('/wallet/balance');
  }

  async getWalletTransactions(page = 1, limit = 20) {
    return this.get(`/wallet/transactions?page=${page}&limit=${limit}`);
  }

  async fundWallet(amount: number) {
    return this.post('/wallet/fund', { amount });
  }

  async transferMoney(transferData: {
    recipientEmail: string;
    amount: number;
    description?: string;
  }) {
    return this.post('/wallet/transfer', transferData);
  }

  // Notifications endpoints
  async getNotifications(page = 1, limit = 20) {
    return this.get(`/notifications?page=${page}&limit=${limit}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.put('/notifications/read-all');
  }

  // Support endpoints
  async createSupportTicket(ticketData: {
    subject: string;
    message: string;
    priority?: string;
    category?: string;
  }) {
    return this.post('/support/tickets', ticketData);
  }

  async getSupportTickets() {
    return this.get('/support/tickets');
  }

  // Products/Services endpoints
  async getProducts(params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const query = queryParams.toString();
    return this.get(`/products${query ? `?${query}` : ''}`);
  }

  // Cart endpoints
  async getCart() {
    return this.get('/cart');
  }

  async addToCart(productId: string, quantity: number) {
    return this.post('/cart', { productId, quantity });
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    return this.put(`/cart/${cartItemId}`, { quantity });
  }

  async removeFromCart(cartItemId: string) {
    return this.delete(`/cart/${cartItemId}`);
  }

  async clearCart() {
    return this.delete('/cart');
  }

  // Payment endpoints
  async getPaymentMethods() {
    return this.get('/payments/methods');
  }

  async initializePayment(data: {
    amount: number;
    email: string;
    orderId?: string;
    paymentFor?: string;
  }) {
    return this.post('/payments/initialize', data);
  }

  async verifyPayment(reference: string) {
    return this.get(`/payments/verify/${reference}`);
  }

  // QR Code endpoints
  async scanQRCode(qrData: string, type: string) {
    return this.post('/qr/scan', { qrCode: qrData, type });
  }

  // Fuel ordering endpoints
  async getFuelStations(location?: { lat: number; lng: number; radius?: number }) {
    const params = location ? 
      `?lat=${location.lat}&lng=${location.lng}&radius=${location.radius || 5}` : '';
    return this.get(`/fuel/stations${params}`);
  }

  async createFuelOrder(orderData: {
    stationId: string;
    fuelType: string;
    quantity: number;
    deliveryLocation: any;
    scheduledTime?: string;
  }) {
    return this.post('/fuel/orders', orderData);
  }

  // Toll payment endpoints
  async getTollGates() {
    return this.get('/toll/gates');
  }

  async payToll(paymentData: {
    gateId: string;
    vehicleType: string;
    amount: number;
  }) {
    return this.post('/toll/pay', paymentData);
  }

  // Real-time tracking endpoints
  async getOrderTracking(orderId: string) {
    return this.get(`/tracking/order/${orderId}`);
  }

  // File upload helper
  async uploadFile(file: any, type: 'profile' | 'document' | 'receipt') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('POST', '/upload', formData);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
