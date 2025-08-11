
// Mobile API service that connects to your existing backend
const API_BASE_URL = 'https://your-replit-url.replit.dev/api';

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async signIn(email: string, password: string) {
    return this.makeRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signUp(userData: any) {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.makeRequest('/auth/me');
  }

  // Orders
  async getOrders() {
    return this.makeRequest('/orders');
  }

  async createOrder(orderData: any) {
    return this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Real-time tracking
  async getOrderTracking(orderId: string) {
    return this.makeRequest(`/orders/${orderId}/tracking`);
  }
}

export const apiService = new ApiService();
