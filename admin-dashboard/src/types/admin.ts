
export interface AdminUser {
  id: number;
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT' | 'MODERATOR';
  permissions: string[];
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  token: string;
  user: AdminUser;
  expiresAt: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  activeOrders: number;
  pendingKYC: number;
  flaggedAccounts: number;
  supportTickets: number;
  fraudAlerts: number;
}

export interface UserWithKYC {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER';
  isVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  profilePicture?: string;
  createdAt: string;
  kycDocuments?: KYCDocument[];
}

export interface KYCDocument {
  id: number;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId?: number;
  userRole: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: number;
  adminNotes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface Transaction {
  id: string;
  userId: number;
  recipientId?: number;
  type: string;
  status: string;
  amount: string;
  fee: string;
  netAmount: string;
  currency: string;
  description?: string;
  paystackReference?: string;
  channel?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  user?: {
    fullName: string;
    email: string;
  };
  recipient?: {
    fullName: string;
    email: string;
  };
}

export interface FraudAlert {
  id: number;
  userId: number;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata: any;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
  };
}

export interface DriverLocation {
  driverId: number;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  lastUpdate: string;
  driver: {
    fullName: string;
    phone: string;
    vehicleType: string;
    vehiclePlate: string;
  };
}
