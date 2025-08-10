
// API configuration and helpers
const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Generic API request helper
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
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

// Authentication APIs
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: any) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),

  getCurrentUser: () =>
    apiRequest('/auth/me'),

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
};

// Enhanced Verification APIs
export const verificationApi = {
  getStatus: () =>
    apiRequest('/verification-enhanced/status'),

  uploadDocument: (formData: FormData) =>
    fetch('/api/verification-enhanced/documents/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(res => res.json()),

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
};

// MFA APIs
export const mfaApi = {
  getStatus: () =>
    apiRequest('/mfa/status'),

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

// Payment APIs
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

  getPaymentMethods: () =>
    apiRequest('/payments/methods'),

  addPaymentMethod: (data: any) =>
    apiRequest('/payments/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePaymentMethod: (id: string) =>
    apiRequest(`/payments/methods/${id}`, {
      method: 'DELETE',
    }),
};

// Wallet APIs
export const walletApi = {
  getBalance: () =>
    apiRequest('/wallet/balance'),

  getTransactions: (page?: number, limit?: number) =>
    apiRequest(`/wallet/transactions?page=${page || 1}&limit=${limit || 20}`),

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
};

// Order APIs
export const orderApi = {
  getOrders: (status?: string) =>
    apiRequest(`/orders${status ? `?status=${status}` : ''}`),

  getOrder: (id: string) =>
    apiRequest(`/orders/${id}`),

  createOrder: (orderData: any) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  updateOrderStatus: (id: string, status: string) =>
    apiRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  cancelOrder: (id: string) =>
    apiRequest(`/orders/${id}/cancel`, {
      method: 'PUT',
    }),
};

// Product APIs
export const productApi = {
  getProducts: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    return apiRequest(`/products${params.toString() ? `?${params}` : ''}`);
  },

  getProduct: (id: string) =>
    apiRequest(`/products/${id}`),

  getCategories: () =>
    apiRequest('/products/categories'),

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
};

// Driver APIs
export const driverApi = {
  updateLocation: (location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) =>
    apiRequest('/drivers/location/update', {
      method: 'POST',
      body: JSON.stringify(location),
    }),

  toggleAvailability: () =>
    apiRequest('/drivers/availability/toggle', {
      method: 'POST',
    }),

  getActiveOrders: () =>
    apiRequest('/drivers/orders/active'),

  acceptOrder: (orderId: string) =>
    apiRequest(`/drivers/orders/${orderId}/accept`, {
      method: 'POST',
    }),

  completeDelivery: (orderId: string) =>
    apiRequest(`/drivers/orders/${orderId}/complete`, {
      method: 'POST',
    }),

  getEarnings: (period?: string) =>
    apiRequest(`/drivers/earnings${period ? `?period=${period}` : ''}`),
};

// Tracking APIs
export const trackingApi = {
  getOrderTracking: (orderId: string) =>
    apiRequest(`/tracking/order/${orderId}`),

  getDriverLocation: (driverId: string) =>
    apiRequest(`/tracking/driver/${driverId}`),

  updateDeliveryStatus: (orderId: string, status: string, location?: any) =>
    apiRequest(`/tracking/order/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, location }),
    }),
};

// Support APIs
export const supportApi = {
  createTicket: (ticketData: {
    subject: string;
    message: string;
    priority?: string;
  }) =>
    apiRequest('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }),

  getTickets: () =>
    apiRequest('/support/tickets'),

  getTicket: (id: string) =>
    apiRequest(`/support/tickets/${id}`),

  addResponse: (ticketId: string, message: string) =>
    apiRequest(`/support/tickets/${ticketId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// Notification APIs
export const notificationApi = {
  getNotifications: (page?: number) =>
    apiRequest(`/notifications${page ? `?page=${page}` : ''}`),

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
};

// Analytics APIs (for merchants/admins)
export const analyticsApi = {
  getDashboardStats: () =>
    apiRequest('/analytics/dashboard'),

  getOrderStats: (period?: string) =>
    apiRequest(`/analytics/orders${period ? `?period=${period}` : ''}`),

  getRevenueStats: (period?: string) =>
    apiRequest(`/analytics/revenue${period ? `?period=${period}` : ''}`),

  getCustomerStats: () =>
    apiRequest('/analytics/customers'),

  getPopularProducts: (limit?: number) =>
    apiRequest(`/analytics/products/popular${limit ? `?limit=${limit}` : ''}`),
};

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
};
