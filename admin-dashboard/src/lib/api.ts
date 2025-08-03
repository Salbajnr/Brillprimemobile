
const API_BASE_URL = '/api/admin';

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

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
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
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials: { username: string; password: string }) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  // Dashboard metrics
  async getDashboardMetrics() {
    return this.request<any>('/metrics');
  }

  async getEnhancedMetrics() {
    return this.request<any>('/enhanced-metrics');
  }

  // User management
  async getUsers(filters?: any) {
    const params = new URLSearchParams(filters);
    return this.request<any[]>(`/users?${params}`);
  }

  async getUserById(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async updateUserStatus(id: string, status: string) {
    return this.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async suspendUser(id: string, reason: string) {
    return this.request(`/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // KYC and verification
  async getPendingVerifications() {
    return this.request<any[]>('/verifications/pending');
  }

  async approveVerification(id: string) {
    return this.request(`/verifications/${id}/approve`, { method: 'POST' });
  }

  async rejectVerification(id: string, reason: string) {
    return this.request(`/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Support tickets
  async getSupportTickets(filters?: any) {
    const params = new URLSearchParams(filters);
    return this.request<any[]>(`/support-tickets?${params}`);
  }

  async getTicketById(id: string) {
    return this.request<any>(`/support-tickets/${id}`);
  }

  async updateTicketStatus(id: string, status: string) {
    return this.request(`/support-tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async respondToTicket(id: string, response: string) {
    return this.request(`/support-tickets/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  // Transactions and refunds
  async getTransactions(filters?: any) {
    const params = new URLSearchParams(filters);
    return this.request<any[]>(`/transactions?${params}`);
  }

  async processRefund(transactionId: string, amount?: number) {
    return this.request(`/transactions/${transactionId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getRefundRequests() {
    return this.request<any[]>('/refunds');
  }

  async approveRefund(id: string) {
    return this.request(`/refunds/${id}/approve`, { method: 'POST' });
  }

  async rejectRefund(id: string, reason: string) {
    return this.request(`/refunds/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Fraud detection
  async getSuspiciousActivities() {
    return this.request<any[]>('/suspicious-activities');
  }

  async flagActivity(activityId: string, severity: string) {
    return this.request(`/suspicious-activities/${activityId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ severity }),
    });
  }

  async resolveActivity(activityId: string, resolution: string) {
    return this.request(`/suspicious-activities/${activityId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  }

  // Driver monitoring
  async getDriverLocations() {
    return this.request<any[]>('/driver-locations');
  }

  // System maintenance
  async triggerBackup() {
    return this.request('/system/backup', { method: 'POST' });
  }

  async getDatabaseStatus() {
    return this.request('/system/status');
  }

  async runMaintenance(type: string) {
    return this.request('/system/maintenance', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  // Content moderation
  async getContentReports() {
    return this.request<any[]>('/content-reports');
  }

  async respondToContentReport(reportId: string, response: string, action: string) {
    return this.request(`/content-reports/${reportId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response, action }),
    });
  }

  // Compliance
  async getComplianceDocuments() {
    return this.request<any[]>('/compliance/documents');
  }

  async updateComplianceStatus(documentId: string, status: string) {
    return this.request(`/compliance/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
}

export const adminApi = new AdminApiClient();
