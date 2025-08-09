// Core type definitions migrated from shared/schema.ts

export type UserRole = 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';

export interface User {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean | null;
  isPhoneVerified: boolean | null;
  profileImage: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  emergencyContact: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean | null;
  lastLoginAt: Date | null;
  createdAt: Date | null;
}

export interface Order {
  id: number;
  orderId: string;
  customerId: number;
  merchantId: number | null;
  driverId: number | null;
  orderType: 'FUEL' | 'COMMODITY' | 'TOLL' | 'DELIVERY';
  status: 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  currency: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string | null;
  deliveryAddress: string | null;
  deliveryFee: number | null;
  estimatedDeliveryTime: Date | null;
  actualDeliveryTime: Date | null;
  notes: string | null;
  orderItems: OrderItem[];
  tracking: OrderTracking[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications: string | null;
}

export interface OrderTracking {
  id: number;
  orderId: number;
  status: string;
  location: string | null;
  timestamp: Date;
  notes: string | null;
}

export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  currency: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Transaction {
  id: number;
  transactionId: string;
  userId: number;
  orderId: number | null;
  type: 'PAYMENT' | 'REFUND' | 'WALLET_CREDIT' | 'WALLET_DEBIT' | 'COMMISSION' | 'WITHDRAWAL';
  amount: number;
  currency: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string | null;
  paymentReference: string | null;
  description: string | null;
  metadata: any | null;
  processingFee: number | null;
  netAmount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Driver {
  id: number;
  userId: number;
  tier: 'BASIC' | 'PREMIUM';
  vehicleType: string | null;
  vehicleModel: string | null;
  vehiclePlateNumber: string | null;
  licenseNumber: string | null;
  licenseExpiryDate: Date | null;
  insuranceNumber: string | null;
  insuranceExpiryDate: Date | null;
  isApproved: boolean | null;
  approvedAt: Date | null;
  rating: number | null;
  totalDeliveries: number | null;
  isOnline: boolean | null;
  currentLocation: any | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Merchant {
  id: number;
  userId: number;
  businessName: string;
  businessType: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessRegistrationNumber: string | null;
  taxNumber: string | null;
  businessDescription: string | null;
  operatingHours: any | null;
  isVerified: boolean | null;
  verifiedAt: Date | null;
  rating: number | null;
  totalSales: number | null;
  commissionRate: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'SYSTEM' | 'PROMOTIONAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRead: boolean | null;
  readAt: Date | null;
  data: any | null;
  expiresAt: Date | null;
  createdAt: Date | null;
}

export interface ChatRoom {
  id: number;
  roomId: string;
  type: 'CUSTOMER_MERCHANT' | 'CUSTOMER_DRIVER' | 'SUPPORT';
  orderId: number | null;
  participants: number[];
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ChatMessage {
  id: number;
  roomId: string;
  senderId: number;
  message: string;
  messageType: 'TEXT' | 'IMAGE' | 'LOCATION' | 'VOICE' | 'FILE';
  attachments: any | null;
  isRead: boolean | null;
  readAt: Date | null;
  editedAt: Date | null;
  createdAt: Date | null;
}

export interface EscrowTransaction {
  id: number;
  transactionId: string;
  orderId: number;
  customerId: number;
  merchantId: number;
  amount: number;
  currency: string | null;
  status: 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  holdStartTime: Date;
  releaseTime: Date | null;
  releaseTrigger: 'AUTOMATIC' | 'MANUAL' | 'CUSTOMER_CONFIRMATION' | 'DELIVERY_CONFIRMATION';
  disputeReason: string | null;
  adminNotes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Input/Insert types for forms
export interface CreateUserInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

export interface CreateOrderInput {
  customerId: number;
  merchantId?: number;
  orderType: 'FUEL' | 'COMMODITY' | 'TOLL' | 'DELIVERY';
  totalAmount: number;
  currency?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: Date;
  notes?: string;
  orderItems: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  location?: string;
  notes?: string;
}

export interface CreateTransactionInput {
  userId: number;
  orderId?: number;
  type: 'PAYMENT' | 'REFUND' | 'WALLET_CREDIT' | 'WALLET_DEBIT' | 'COMMISSION' | 'WITHDRAWAL';
  amount: number;
  currency?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: any;
}

export interface SendNotificationInput {
  userId: number;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'SYSTEM' | 'PROMOTIONAL';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  data?: any;
  expiresAt?: Date;
}

export interface SendChatMessageInput {
  roomId: string;
  senderId: number;
  message: string;
  messageType?: 'TEXT' | 'IMAGE' | 'LOCATION' | 'VOICE' | 'FILE';
  attachments?: any;
}

// Location and real-time types
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface LocationUpdate {
  userId: number;
  location: Location;
  trackingType: 'DELIVERY' | 'PERSONAL' | 'EMERGENCY';
  sharingLevel: 'PRIVATE' | 'CUSTOMERS_ONLY' | 'PUBLIC';
}

export interface DeliveryTracking {
  deliveryId: string;
  driverId: number;
  orderId: string;
  status: string;
  location: Location;
  estimatedTime?: string;
  timestamp: Date;
}