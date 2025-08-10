export interface User {
  id: number;
  userId?: string;
  fullName: string;
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';
  isVerified: boolean;
  profilePicture?: string;
  phoneNumber?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  user?: User;
  requiresVerification?: boolean;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  merchantId?: number;
  driverId?: number;
  orderType: string;
  status: string;
  totalAmount: string;
  deliveryAddress?: string;
  orderData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  orderId?: number;
  userId: number;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionRef?: string;
  metadata?: any;
  createdAt: string;
}

export interface DashboardData {
  user: User;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSpent: number;
  };
  recentOrders: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    date: string;
  }>;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.PROD
      ? window.location.origin
      : 'http://localhost:5000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Authentication methods
  async signup(userData: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role: string;
    agreeToTerms: boolean;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signin(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Dashboard methods
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    return this.request<DashboardData>('/dashboard');
  }

  // User methods
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Order methods
  async getOrders(): Promise<ApiResponse<Order[]>> {
    return this.request<Order[]>('/orders');
  }

  async createOrder(orderData: any): Promise<ApiResponse<Order>> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Transaction methods
  async getTransactions(): Promise<ApiResponse<Transaction[]>> {
    return this.request<Transaction[]>('/transactions');
  }

  async createTransaction(transactionData: any): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>('/payments/process', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Products methods
  async getProducts(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/products');
  }

  async searchProducts(query: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/products/search?q=${encodeURIComponent(query)}`);
  }

  // Notifications methods
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/notifications');
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; version: string }>> {
    return this.request<{ status: string; timestamp: string; version: string }>('/health');
  }

  // Real-time features
  async subscribeToOrderUpdates(orderId: string, callback: (data: any) => void): Promise<void> {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll implement polling as a fallback
    const pollInterval = setInterval(async () => {
      const response = await this.getOrderById(orderId);
      if (response.success && response.data) {
        callback(response.data);
      }
    }, 5000);

    // Store cleanup function for potential use
    const cleanup = () => clearInterval(pollInterval);
    return Promise.resolve();
  }

  // Fuel Orders
  async createFuelOrder(orderData: any): Promise<any> {
    const response = await fetch('/api/fuel-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error('Failed to create fuel order');
    }

    return response.json();
  }

  async getFuelOrders(): Promise<any> {
    const response = await fetch('/api/fuel-orders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fuel orders');
    }

    return response.json();
  }

  async trackFuelOrder(orderId: string): Promise<any> {
    const response = await fetch(`/api/fuel-orders/${orderId}/track`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to track fuel order');
    }

    return response.json();
  }

  // Payments
  async initializePayment(paymentData: any): Promise<any> {
    const response = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize payment');
    }

    return response.json();
  }

  async verifyPayment(reference: string): Promise<any> {
    const response = await fetch(`/api/payments/verify/${reference}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }

    return response.json();
  }

  // Toll Payments
  async payToll(tollData: any): Promise<any> {
    const response = await fetch('/api/toll-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(tollData),
    });

    if (!response.ok) {
      throw new Error('Failed to process toll payment');
    }

    return response.json();
  }

  // Wallet
  async getWalletBalance(): Promise<any> {
    const response = await fetch('/api/wallet/balance', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet balance');
    }

    return response.json();
  }

  async fundWallet(amount: number): Promise<any> {
    const response = await fetch('/api/wallet/fund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      throw new Error('Failed to fund wallet');
    }

    return response.json();
  }

  // Driver specific
  async getDeliveryRequests(): Promise<any> {
    const response = await fetch('/api/driver/delivery-requests', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch delivery requests');
    }

    return response.json();
  }

  async acceptDelivery(deliveryId: string): Promise<any> {
    const response = await fetch(`/api/driver/delivery-requests/${deliveryId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to accept delivery');
    }

    return response.json();
  }

  async updateDriverLocation(location: { latitude: number; longitude: number }): Promise<any> {
    const response = await fetch('/api/driver/location', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(location),
    });

    if (!response.ok) {
      throw new Error('Failed to update location');
    }

    return response.json();
  }

  // Merchant specific
  async getMerchantProducts(): Promise<any> {
    const response = await fetch('/api/products', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch merchant products');
    }

    return response.json();
  }

  async createProduct(productData: any): Promise<any> {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      throw new Error('Failed to add product');
    }

    return response.json();
  }

  // Admin specific
  async getSystemMetrics(): Promise<any> {
    const response = await fetch('/api/admin/metrics', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch system metrics');
    }

    return response.json();
  }

  async getAllUsers(): Promise<any> {
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async getAllTransactions(): Promise<any> {
    const response = await fetch('/api/admin/transactions', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return response.json();
  }

  // Support
  async getSupportTickets(): Promise<any> {
    const response = await fetch('/api/support/tickets', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch support tickets');
    }

    return response.json();
  }

  async createSupportTicket(ticketData: any): Promise<any> {
    const response = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(ticketData),
    });

    if (!response.ok) {
      throw new Error('Failed to create support ticket');
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
export default apiClient;