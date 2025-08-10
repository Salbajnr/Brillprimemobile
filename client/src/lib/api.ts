
// API configuration and helpers
const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Generic API request helper with enhanced error handling
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: Request failed`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    
    // Log frontend errors to backend
    if (endpoint !== '/analytics/log-error') {
      try {
        await fetch('/api/analytics/log-error', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            error: error.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
    
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

// Real-time WebSocket connection helper
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();

// Authentication APIs with real-time session management
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (result.success) {
      wsManager.connect();
    }
    
    return result;
  },

  register: async (userData: any) => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (result.success) {
      wsManager.connect();
    }
    
    return result;
  },

  logout: async () => {
    const result = await apiRequest('/auth/logout', { method: 'POST' });
    wsManager.disconnect();
    return result;
  },

  getCurrentUser: () => apiRequest('/auth/me'),

  verifyOtp: (data: { phone: string; code: string }) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resendOtp: (phone: string) =>
    apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  // Real-time session validation
  validateSession: () => apiRequest('/auth/validate-session'),
};

// Enhanced Verification APIs with real-time updates
export const verificationApi = {
  getStatus: () => apiRequest('/verification-enhanced/status'),

  uploadDocument: async (formData: FormData) => {
    const response = await fetch('/api/verification-enhanced/documents/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return response.json();
  },

  verifyBiometric: (data: {
    biometricType: 'FACE' | 'FINGERPRINT';
    biometricData: string;
    deviceInfo: {
      deviceId: string;
      platform: string;
      version: string;
    };
  }) =>
    apiRequest('/verification-enhanced/biometric/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitKyc: (kycData: any) =>
    apiRequest('/verification-enhanced/kyc/enhanced', {
      method: 'POST',
      body: JSON.stringify(kycData),
    }),

  // Real-time verification status updates
  subscribeToUpdates: (callback: Function) => {
    wsManager.on('verification_update', callback);
  },
};

// MFA APIs with enhanced security
export const mfaApi = {
  getStatus: () => apiRequest('/mfa/status'),

  setup: (data: {
    method: 'SMS' | 'EMAIL' | 'TOTP';
    phoneNumber?: string;
    email?: string;
  }) =>
    apiRequest('/mfa/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateToken: (data: { userId: number; method: string }) =>
    apiRequest('/mfa/generate-token', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verify: (data: {
    token: string;
    method: string;
    rememberDevice?: boolean;
  }) =>
    apiRequest('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  disable: (confirmationToken: string) =>
    apiRequest('/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ confirmationToken }),
    }),
};

// Real-time Payment APIs with transaction tracking
export const paymentApi = {
  initializePayment: (data: {
    amount: number;
    email: string;
    orderId?: string;
    paymentFor?: string;
  }) =>
    apiRequest('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyPayment: (reference: string) =>
    apiRequest(`/payments/verify/${reference}`),

  getPaymentMethods: () => apiRequest('/payments/methods'),

  addPaymentMethod: (data: any) =>
    apiRequest('/payments/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePaymentMethod: (id: string) =>
    apiRequest(`/payments/methods/${id}`, {
      method: 'DELETE',
    }),

  // Real-time payment updates
  subscribeToPaymentUpdates: (callback: Function) => {
    wsManager.on('payment_update', callback);
  },
};

// Enhanced Wallet APIs with real-time balance updates
export const walletApi = {
  getBalance: () => apiRequest('/wallet/balance'),

  getTransactions: (params: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/wallet/transactions?${queryParams}`);
  },

  fundWallet: (amount: number) =>
    apiRequest('/wallet/fund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  withdraw: (data: { amount: number; bankAccount: any }) =>
    apiRequest('/withdrawal/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transfer: (data: {
    recipientEmail: string;
    amount: number;
    description?: string;
  }) =>
    apiRequest('/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Real-time wallet updates
  subscribeToWalletUpdates: (callback: Function) => {
    wsManager.on('wallet_update', callback);
  },
};

// Enhanced Order APIs with real-time tracking
export const orderApi = {
  getOrders: (params: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/orders?${queryParams}`);
  },

  getOrder: (id: string) => apiRequest(`/orders/${id}`),

  createOrder: (orderData: any) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  updateOrderStatus: (id: string, status: string, location?: any) =>
    apiRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, location }),
    }),

  cancelOrder: (id: string, reason?: string) =>
    apiRequest(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  // Real-time order tracking
  subscribeToOrderUpdates: (orderId: string, callback: Function) => {
    wsManager.on(`order_${orderId}_update`, callback);
  },

  // Bulk order operations
  bulkUpdateOrders: (updates: Array<{ id: string; status: string }>) =>
    apiRequest('/orders/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    }),
};

// Enhanced Product APIs with real-time inventory
export const productApi = {
  getProducts: (params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    availability?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/products?${queryParams}`);
  },

  getProduct: (id: string) => apiRequest(`/products/${id}`),

  getCategories: () => apiRequest('/products/categories'),

  createProduct: (productData: any) =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  updateProduct: (id: string, productData: any) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }),

  deleteProduct: (id: string) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Real-time inventory updates
  subscribeToInventoryUpdates: (productId: string, callback: Function) => {
    wsManager.on(`product_${productId}_inventory`, callback);
  },
};

// Enhanced Driver APIs with real-time location tracking
export const driverApi = {
  updateLocation: (location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) =>
    apiRequest('/drivers/location/update', {
      method: 'POST',
      body: JSON.stringify({
        ...location,
        timestamp: new Date().toISOString()
      }),
    }),

  toggleAvailability: () =>
    apiRequest('/drivers/availability/toggle', {
      method: 'POST',
    }),

  getActiveOrders: () => apiRequest('/drivers/orders/active'),

  acceptOrder: (orderId: string) =>
    apiRequest(`/drivers/orders/${orderId}/accept`, {
      method: 'POST',
    }),

  completeDelivery: (orderId: string, completionData?: any) =>
    apiRequest(`/drivers/orders/${orderId}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    }),

  getEarnings: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/drivers/earnings?${queryParams}`);
  },

  // Real-time driver updates
  subscribeToDriverUpdates: (callback: Function) => {
    wsManager.on('driver_update', callback);
  },

  // Performance metrics
  getPerformanceMetrics: () => apiRequest('/drivers/performance'),
};

// Enhanced Tracking APIs with real-time updates
export const trackingApi = {
  getOrderTracking: (orderId: string) =>
    apiRequest(`/tracking/order/${orderId}`),

  getDriverLocation: (driverId: string) =>
    apiRequest(`/tracking/driver/${driverId}`),

  updateDeliveryStatus: (orderId: string, status: string, location?: any) =>
    apiRequest(`/tracking/order/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, location, timestamp: new Date().toISOString() }),
    }),

  // Real-time tracking subscriptions
  subscribeToOrderTracking: (orderId: string, callback: Function) => {
    wsManager.on(`tracking_${orderId}`, callback);
  },

  subscribeToDriverTracking: (driverId: string, callback: Function) => {
    wsManager.on(`driver_location_${driverId}`, callback);
  },

  // Batch tracking updates
  getMultipleOrderTracking: (orderIds: string[]) =>
    apiRequest('/tracking/orders/batch', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    }),
};

// Enhanced Support APIs with real-time chat
export const supportApi = {
  createTicket: (ticketData: {
    subject: string;
    message: string;
    priority?: string;
    category?: string;
    attachments?: File[];
  }) => {
    const formData = new FormData();
    formData.append('subject', ticketData.subject);
    formData.append('message', ticketData.message);
    if (ticketData.priority) formData.append('priority', ticketData.priority);
    if (ticketData.category) formData.append('category', ticketData.category);
    
    ticketData.attachments?.forEach((file, index) => {
      formData.append(`attachment_${index}`, file);
    });

    return fetch('/api/support/tickets', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(res => res.json());
  },

  getTickets: (params: {
    status?: string;
    priority?: string;
    page?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/support/tickets?${queryParams}`);
  },

  getTicket: (id: string) => apiRequest(`/support/tickets/${id}`),

  addResponse: (ticketId: string, message: string, attachments?: File[]) => {
    const formData = new FormData();
    formData.append('message', message);
    
    attachments?.forEach((file, index) => {
      formData.append(`attachment_${index}`, file);
    });

    return fetch(`/api/support/tickets/${ticketId}/responses`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(res => res.json());
  },

  // Real-time support updates
  subscribeToTicketUpdates: (ticketId: string, callback: Function) => {
    wsManager.on(`ticket_${ticketId}_update`, callback);
  },
};

// Enhanced Notification APIs with real-time delivery
export const notificationApi = {
  getNotifications: (params: {
    page?: number;
    limit?: number;
    type?: string;
    unreadOnly?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/notifications?${queryParams}`);
  },

  markAsRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    apiRequest('/notifications/read-all', {
      method: 'PUT',
    }),

  deleteNotification: (id: string) =>
    apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Real-time notification delivery
  subscribeToNotifications: (callback: Function) => {
    wsManager.on('new_notification', callback);
  },

  // Notification preferences
  getPreferences: () => apiRequest('/notifications/preferences'),
  
  updatePreferences: (preferences: any) =>
    apiRequest('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),
};

// Enhanced Analytics APIs with real-time metrics
export const analyticsApi = {
  getDashboardStats: (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return apiRequest(`/analytics/dashboard${params}`);
  },

  getOrderStats: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/analytics/orders?${queryParams}`);
  },

  getRevenueStats: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    
    return apiRequest(`/analytics/revenue?${queryParams}`);
  },

  getCustomerStats: () => apiRequest('/analytics/customers'),

  getPopularProducts: (limit?: number) =>
    apiRequest(`/analytics/products/popular${limit ? `?limit=${limit}` : ''}`),

  // Real-time analytics updates
  subscribeToAnalytics: (callback: Function) => {
    wsManager.on('analytics_update', callback);
  },

  // Performance monitoring
  getPerformanceMetrics: () => apiRequest('/analytics/performance'),
  
  // Custom analytics
  customQuery: (query: any) =>
    apiRequest('/analytics/custom', {
      method: 'POST',
      body: JSON.stringify(query),
    }),
};

// Fuel Services APIs
export const fuelApi = {
  getStations: (location?: { lat: number; lng: number; radius?: number }) => {
    const params = location ? 
      `?lat=${location.lat}&lng=${location.lng}&radius=${location.radius || 5}` : '';
    return apiRequest(`/fuel/stations${params}`);
  },

  createFuelOrder: (orderData: {
    stationId: string;
    fuelType: string;
    quantity: number;
    deliveryLocation: any;
    scheduledTime?: string;
  }) =>
    apiRequest('/fuel/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getFuelOrders: () => apiRequest('/fuel/orders'),

  getFuelOrder: (id: string) => apiRequest(`/fuel/orders/${id}`),

  cancelFuelOrder: (id: string) =>
    apiRequest(`/fuel/orders/${id}/cancel`, {
      method: 'PUT',
    }),
};

// Toll Payment APIs
export const tollApi = {
  getTollGates: (route?: { origin: any; destination: any }) => {
    if (route) {
      return apiRequest('/toll/gates/route', {
        method: 'POST',
        body: JSON.stringify(route),
      });
    }
    return apiRequest('/toll/gates');
  },

  calculateTollFee: (route: { gateIds: string[]; vehicleType: string }) =>
    apiRequest('/toll/calculate', {
      method: 'POST',
      body: JSON.stringify(route),
    }),

  payToll: (paymentData: {
    gateId: string;
    vehicleType: string;
    amount: number;
  }) =>
    apiRequest('/toll/pay', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),

  getTollHistory: () => apiRequest('/toll/history'),
};

// Initialize WebSocket connection on module load
if (typeof window !== 'undefined') {
  // Check if user is authenticated before connecting
  authApi.getCurrentUser().then(result => {
    if (result.success) {
      wsManager.connect();
    }
  });
}

export default {
  auth: authApi,
  verification: verificationApi,
  mfa: mfaApi,
  payment: paymentApi,
  wallet: walletApi,
  order: orderApi,
  product: productApi,
  driver: driverApi,
  tracking: trackingApi,
  support: supportApi,
  notification: notificationApi,
  analytics: analyticsApi,
  fuel: fuelApi,
  toll: tollApi,
  wsManager,
};
