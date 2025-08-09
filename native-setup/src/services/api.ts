
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:5000') {
    this.baseURL = baseURL;
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
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
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
      const response = await this.api.post('/auth/register', userData);
      return response.data;
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
      const response = await this.api.post('/auth/login', credentials);
      
      // Store tokens
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        if (response.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }
      
      return response.data;
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
      const response = await this.api.post('/auth/verify-otp', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'OTP verification failed',
      };
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
  }

  // User profile endpoints
  async getUserProfile(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/user/profile');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get profile',
      };
    }
  }

  async updateProfile(profileData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/user/profile', profileData);
      return response.data;
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
      const response = await this.api.get('/orders');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get orders',
      };
    }
  }

  async createOrder(orderData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/orders', orderData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create order',
      };
    }
  }

  // Products endpoints
  async getProducts(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/products');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get products',
      };
    }
  }

  // Merchants endpoints
  async getMerchants(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/merchants');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get merchants',
      };
    }
  }

  // Update base URL
  updateBaseURL(newBaseURL: string) {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }
}

export const apiService = new ApiService();
export default apiService;
