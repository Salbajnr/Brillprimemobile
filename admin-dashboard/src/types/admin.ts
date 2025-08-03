
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  assignedTo?: string;
  responses: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  adminId: string;
  response: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  description: string;
  createdAt: string;
  refundable: boolean;
}

export interface RefundRequest {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  processedBy?: string;
}

export interface SuspiciousActivity {
  id: string;
  userId: string;
  type: 'MULTIPLE_FAILED_LOGINS' | 'UNUSUAL_TRANSACTION' | 'LOCATION_ANOMALY' | 'VELOCITY_CHECK';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  flaggedBy: 'SYSTEM' | 'ADMIN';
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingVerifications: number;
  openTickets: number;
  suspiciousActivities: number;
  onlineDrivers: number;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  lastUpdated: string;
}
