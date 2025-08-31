
export interface AdminUser {
  id: number;
  userId: string;
  role: string;
  permissions: string[];
  email: string;
  fullName: string;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  kycStatus?: string;
  totalSpent?: number;
  totalOrders?: number;
}

export interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number;
  consumers: number;
  merchants: number;
  drivers: number;
  admins: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingKyc: number;
  disputedTransactions: number;
}
