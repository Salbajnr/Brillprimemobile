import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private storageAdapter: StorageAdapter;

  constructor(baseURL: string = 'http://0.0.0.0:5000', storageAdapter: StorageAdapter) {
    this.baseURL = baseURL;
    this.storageAdapter = storageAdapter;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.storageAdapter.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          await this.storageAdapter.multiRemove(['authToken', 'refreshToken']);
          // Redirect to login - handled by navigation
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/auth/signup', userData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/auth/signin', credentials);

      // Store tokens
      if (response.data.user) {
        const token = response.data.token || 'mock-token';
        await this.storageAdapter.setItem('authToken', token);
        if (response.data.refreshToken) {
          await this.storageAdapter.setItem('refreshToken', response.data.refreshToken);
        }
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  }

  async verifyOTP(data: {
    email: string;
    otp: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/auth/verify-otp', data);

      // Store tokens after successful verification
      if (response.data.user) {
        const token = response.data.token || 'mock-token';
        await this.storageAdapter.setItem('authToken', token);
        if (response.data.refreshToken) {
          await this.storageAdapter.setItem('refreshToken', response.data.refreshToken);
        }
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'OTP verification failed',
      };
    }
  }

  async resendOTP(email: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/auth/resend-otp', { email });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resend OTP',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.log('Logout API call failed, clearing local storage anyway');
    } finally {
      await this.storageAdapter.multiRemove(['authToken', 'refreshToken']);
    }
  }

  // User profile endpoints
  async getUserProfile(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/user/profile');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get profile',
      };
    }
  }

  async updateProfile(profileData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/api/user/profile', profileData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
      };
    }
  }

  // Orders endpoints
  async getOrders(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/orders');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get orders',
      };
    }
  }

  async createOrder(orderData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/orders', orderData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create order',
      };
    }
  }

  async getOrderById(orderId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.get(`/api/orders/${orderId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get order',
      };
    }
  }

  // Products endpoints
  async getProducts(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/products');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get products',
      };
    }
  }

  async getProductById(productId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.get(`/api/products/${productId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get product',
      };
    }
  }

  // Merchants endpoints
  async getMerchants(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/merchants');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get merchants',
      };
    }
  }

  async getMerchantById(merchantId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.get(`/api/merchants/${merchantId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get merchant',
      };
    }
  }

  // Merchant dashboard endpoints
  async getMerchantMetrics(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/merchant/metrics');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get metrics',
      };
    }
  }

  async getMerchantOrders(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/merchant/orders');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get merchant orders',
      };
    }
  }

  async getMerchantProducts(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/merchant/products');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get merchant products',
      };
    }
  }

  async getMerchantRevenue(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/merchant/revenue');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get revenue data',
      };
    }
  }

  // Driver endpoints
  async getDriverDeliveries(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/driver/deliveries');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get deliveries',
      };
    }
  }

  async updateDeliveryStatus(deliveryId: string, status: string, data: any = {}): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/api/driver/deliveries/${deliveryId}/status`, {
        status,
        ...data,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update delivery status',
      };
    }
  }

  // Payment endpoints
  async initializePayment(paymentData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/payments/initialize', paymentData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to initialize payment',
      };
    }
  }

  async verifyPayment(reference: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/payments/verify', { reference });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify payment',
      };
    }
  }

  // Wallet endpoints
  async getWalletBalance(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/wallet/balance');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get wallet balance',
      };
    }
  }

  async getWalletTransactions(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/wallet/transactions');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get transactions',
      };
    }
  }

  // Location endpoints
  async updateLocation(locationData: {
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/api/location/update', locationData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update location',
      };
    }
  }

  // Notifications endpoints
  async getNotifications(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/notifications');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get notifications',
      };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/api/notifications/${notificationId}/read`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to mark notification as read',
      };
    }
  }

  // Chat endpoints
  async getChatRooms(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/api/chat/rooms');
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get chat rooms',
      };
    }
  }

  async getChatMessages(roomId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.get(`/api/chat/rooms/${roomId}/messages`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get messages',
      };
    }
  }

  async sendChatMessage(roomId: string, message: string, messageType: string = 'text'): Promise<ApiResponse> {
    try {
      const response = await this.api.post(`/api/chat/rooms/${roomId}/messages`, {
        message,
        messageType,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send message',
      };
    }
  }

  // Update base URL
  updateBaseURL(newBaseURL: string) {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }
}