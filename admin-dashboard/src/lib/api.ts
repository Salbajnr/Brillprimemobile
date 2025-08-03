
const API_BASE_URL = 'http://0.0.0.0:5000/api/admin';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class AdminApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('admin_token', this.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('admin_token');
    await this.request('/auth/logout', { method: 'POST' });
  }

  async getProfile(): Promise<any> {
    return this.request('/auth/profile');
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<any> {
    return this.request('/dashboard/metrics');
  }

  // User management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/users?${queryParams}`);
  }

  async getUserById(id: number): Promise<any> {
    return this.request(`/users/${id}`);
  }

  async updateUserStatus(id: number, status: string): Promise<any> {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async flagUser(id: number, reason: string): Promise<any> {
    return this.request(`/users/${id}/flag`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // KYC Management
  async getPendingKYC(params?: { page?: number; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/kyc/pending?${queryParams}`);
  }

  async reviewKYC(documentId: number, action: 'approve' | 'reject', reason?: string): Promise<any> {
    return this.request(`/kyc/${documentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }

  // Merchant Applications
  async getMerchantApplications(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/merchants/applications?${queryParams}`);
  }

  async reviewMerchantApplication(id: number, action: 'approve' | 'reject', reason?: string): Promise<any> {
    return this.request(`/merchants/applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }

  // Driver Applications
  async getDriverApplications(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/drivers/applications?${queryParams}`);
  }

  async reviewDriverApplication(id: number, action: 'approve' | 'reject', reason?: string): Promise<any> {
    return this.request(`/drivers/applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }

  // Support Tickets
  async getSupportTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/support/tickets?${queryParams}`);
  }

  async getTicketById(id: string): Promise<any> {
    return this.request(`/support/tickets/${id}`);
  }

  async updateTicket(id: string, updates: {
    status?: string;
    priority?: string;
    assignedTo?: number;
    adminNotes?: string;
    resolution?: string;
  }): Promise<any> {
    return this.request(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Transactions
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/transactions?${queryParams}`);
  }

  async refundTransaction(id: string, reason: string): Promise<any> {
    return this.request(`/transactions/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async holdTransaction(id: string, reason: string): Promise<any> {
    return this.request(`/transactions/${id}/hold`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async releaseTransaction(id: string): Promise<any> {
    return this.request(`/transactions/${id}/release`, {
      method: 'POST',
    });
  }

  // Fraud Detection
  async getFraudAlerts(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/fraud/alerts?${queryParams}`);
  }

  async updateFraudAlert(id: number, status: string, notes?: string): Promise<any> {
    return this.request(`/fraud/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Real-time monitoring
  async getDriverLocations(): Promise<any> {
    return this.request('/monitoring/drivers/locations');
  }

  async getSystemHealth(): Promise<any> {
    return this.request('/monitoring/system/health');
  }

  // Database maintenance
  async triggerBackup(): Promise<any> {
    return this.request('/maintenance/backup', {
      method: 'POST',
    });
  }

  async getBackupHistory(): Promise<any> {
    return this.request('/maintenance/backups');
  }

  async cleanupLogs(): Promise<any> {
    return this.request('/maintenance/cleanup-logs', {
      method: 'POST',
    });
  }

  // Security & Compliance
  async getSecurityEvents(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    type?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    return this.request(`/security/events?${queryParams}`);
  }

  async getComplianceReport(type: string, dateFrom: string, dateTo: string): Promise<any> {
    return this.request(`/compliance/reports/${type}?from=${dateFrom}&to=${dateTo}`);
  }
}

export const adminApi = new AdminApiClient();
