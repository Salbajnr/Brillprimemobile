
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class APIServiceClass {
  private api: AxiosInstance;
  private baseURL: string = '';

  constructor() {
    this.api = axios.create();
    this.setupInterceptors();
  }

  configure(config: { baseURL: string; timeout?: number }) {
    this.baseURL = config.baseURL;
    this.api.defaults.baseURL = config.baseURL;
    this.api.defaults.timeout = config.timeout || 10000;
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userRole');
          // Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async signup(userData: any) {
    return this.api.post('/auth/signup', userData);
  }

  async signin(credentials: any) {
    return this.api.post('/auth/signin', credentials);
  }

  async verifyOtp(data: any) {
    return this.api.post('/auth/verify-otp', data);
  }

  async socialAuth(provider: string, token: string) {
    return this.api.post('/social-auth', { provider, token });
  }

  // User profile
  async getProfile() {
    return this.api.get('/profile');
  }

  async updateProfile(data: any) {
    return this.api.put('/profile', data);
  }

  // Orders
  async getOrders() {
    return this.api.get('/orders');
  }

  async createOrder(orderData: any) {
    return this.api.post('/orders', orderData);
  }

  // Real-time tracking
  async getOrderTracking(orderId: string) {
    return this.api.get(`/real-time-tracking/${orderId}`);
  }

  // Payments
  async processPayment(paymentData: any) {
    return this.api.post('/payments/process', paymentData);
  }

  // Wallet
  async getWalletBalance() {
    return this.api.get('/wallet/balance');
  }

  async fundWallet(amount: number, method: string) {
    return this.api.post('/wallet/fund', { amount, method });
  }

  // Location services
  async updateDriverLocation(locationData: any) {
    return this.api.post('/driver/location', locationData);
  }

  // Fuel orders
  async createFuelOrder(orderData: any) {
    return this.api.post('/fuel-orders', orderData);
  }

  // Merchant services
  async getMerchantProducts() {
    return this.api.get('/merchant/products');
  }

  async addMerchantProduct(productData: any) {
    return this.api.post('/merchant/products', productData);
  }
}

export const APIService = new APIServiceClass();
