
import { ApiResponse } from '../shared/types';

// Get the base URL from environment or use default
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include', // Include cookies for session management
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: result.data || result,
      };
    } catch (error) {
      console.error(`API ${method} ${endpoint} error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
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
    return this.post('/api/auth/signin', credentials);
  }

  async signUp(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
  }) {
    return this.post('/api/auth/signup', userData);
  }

  async signOut() {
    return this.post('/api/auth/signout');
  }

  async refreshToken() {
    return this.post('/api/auth/refresh');
  }

  // User profile endpoints
  async getProfile() {
    return this.get('/api/user/profile');
  }

  async updateProfile(profileData: {
    fullName?: string;
    email?: string;
    phone?: string;
  }) {
    return this.put('/api/user/profile', profileData);
  }

  // Dashboard endpoints
  async getDashboard() {
    return this.get('/api/dashboard');
  }

  // Orders endpoints
  async getOrders() {
    return this.get('/api/orders');
  }

  async getOrder(orderId: string) {
    return this.get(`/api/orders/${orderId}`);
  }

  async createOrder(orderData: any) {
    return this.post('/api/orders', orderData);
  }

  // Wallet endpoints
  async getWalletBalance() {
    return this.get('/api/wallet/balance');
  }

  async fundWallet(amount: number, paymentMethod: string) {
    return this.post('/api/wallet/fund', { amount, paymentMethod });
  }

  async transferMoney(transferData: {
    recipientId?: string;
    recipientEmail?: string;
    amount: number;
    note?: string;
  }) {
    return this.post('/api/wallet/transfer', transferData);
  }

  async getTransactions(page = 1, limit = 20) {
    return this.get(`/api/wallet/transactions?page=${page}&limit=${limit}`);
  }

  // Notifications endpoints
  async getNotifications() {
    return this.get('/api/notifications');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.put(`/api/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.put('/api/notifications/mark-all-read');
  }

  // Support endpoints
  async createSupportTicket(ticketData: {
    name: string;
    email: string;
    subject: string;
    message: string;
    priority?: string;
  }) {
    return this.post('/api/support/tickets', ticketData);
  }

  async getSupportTickets() {
    return this.get('/api/support/tickets');
  }

  // Products/Services endpoints
  async getProducts(category?: string) {
    const endpoint = category ? `/api/products?category=${category}` : '/api/products';
    return this.get(endpoint);
  }

  async searchProducts(query: string) {
    return this.get(`/api/products/search?q=${encodeURIComponent(query)}`);
  }

  // Cart endpoints
  async getCart() {
    return this.get('/api/cart');
  }

  async addToCart(productId: string, quantity: number) {
    return this.post('/api/cart', { productId, quantity });
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    return this.put(`/api/cart/${cartItemId}`, { quantity });
  }

  async removeFromCart(cartItemId: string) {
    return this.delete(`/api/cart/${cartItemId}`);
  }

  async clearCart() {
    return this.delete('/api/cart');
  }

  // Real-time tracking endpoints
  async getOrderTracking(orderId: string) {
    return this.get(`/api/tracking/order/${orderId}`);
  }

  async getDriverLocation(driverId: string) {
    return this.get(`/api/tracking/driver/${driverId}`);
  }

  // Payment endpoints
  async getPaymentMethods() {
    return this.get('/api/payments/methods');
  }

  async addPaymentMethod(paymentData: {
    type: 'card' | 'bank';
    cardNumber?: string;
    expiryMonth?: number;
    expiryYear?: number;
    cvv?: string;
    bankCode?: string;
    accountNumber?: string;
  }) {
    return this.post('/api/payments/methods', paymentData);
  }

  async deletePaymentMethod(paymentMethodId: string) {
    return this.delete(`/api/payments/methods/${paymentMethodId}`);
  }

  // QR Code endpoints
  async scanQRCode(qrData: string, type: string) {
    return this.post('/api/qr/scan', { qrCode: qrData, type });
  }

  async verifyDelivery(deliveryData: {
    orderId: string;
    qrCode: string;
    driverConfirmed: boolean;
  }) {
    return this.post('/api/qr/verify-delivery', deliveryData);
  }

  // File upload helper
  async uploadFile(file: any, type: 'profile' | 'document' | 'receipt') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('POST', '/api/upload', formData, {
      // Remove Content-Type header to let fetch set it automatically for FormData
    });
  }

  // Health check
  async healthCheck() {
    return this.get('/api/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
