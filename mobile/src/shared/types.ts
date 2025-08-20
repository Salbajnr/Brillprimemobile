// Import types from web app's shared schema
export * from '../../../shared/schema';

// React Navigation types
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Navigation stack parameter list
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  SignIn: { email?: string };
  SignUp: { role?: string };
  OTPVerification: {
    email: string;
    phone?: string;
    verificationType?: 'email' | 'phone';
  };
  ForgotPassword: undefined;
  ResetPassword: {
    token: string;
  };
  OTPVerification: {
    email?: string;
    phone?: string;
    verificationType?: 'email' | 'phone';
  };
  Dashboard: undefined;
  DriverDashboard: undefined;
  MerchantDashboard: undefined;
  VendorFeed: undefined;
  BillPayments: undefined;
  LocationSetup: undefined;
  BiometricSetup: undefined;
  MFASetup: undefined;
  IdentityVerification: undefined;
  Home: undefined;
  DriverDashboard: undefined;
  MerchantDashboard: undefined;
  Profile: undefined;
  EditProfile: undefined;
  AccountSettings: undefined;
  Wallet: undefined;
  OrderHistory: undefined;
  TrackOrder: { orderId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  PaymentMethods: undefined;
  BillPayments: undefined;
  MoneyTransfer: undefined;
  FuelOrdering: undefined;
  TollPayments: undefined;
  QRScanner: { type?: 'payment' | 'delivery' | 'toll' };
  SearchResults: { query: string };
  VendorFeed: { category?: string };
  Messages: { chatId?: string };
  Notifications: undefined;
  Support: undefined;
};

// Navigation prop types
export type NavigationProps<T extends keyof RootStackParamList = keyof RootStackParamList> = {
  navigation: StackNavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
};

// Mobile-specific user type
export interface MobileUser {
  id: number;
  email: string;
  fullName: string;
  role: 'CONSUMER' | 'DRIVER' | 'MERCHANT' | 'ADMIN';
  phone?: string;
  profilePicture?: string;
  isVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

// API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Dashboard data structure
export interface DashboardData {
  user: MobileUser;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSpent: number;
    walletBalance: number;
  };
  recentOrders: Order[];
  notifications: Notification[];
}

// Order structure
export interface Order {
  id: string;
  type: 'FUEL' | 'TOLL' | 'COMMODITY' | 'BILL_PAYMENT';
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  amount: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
}

// Notification structure
export interface Notification {
  id: string;
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'MARKETING';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

// Wallet types
export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  reference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  currency: string;
}

// Cart types
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

// Payment types
export interface PaymentMethod {
  id: string;
  type: 'CARD' | 'BANK' | 'WALLET';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountName?: string;
  isDefault: boolean;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Fuel ordering types
export interface FuelStation {
  id: string;
  name: string;
  location: Location;
  distance: number;
  rating: number;
  fuelTypes: FuelType[];
  isOpen: boolean;
  operatingHours: {
    open: string;
    close: string;
  };
}

export interface FuelType {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

// Toll payment types
export interface TollGate {
  id: string;
  name: string;
  location: Location;
  vehicleTypes: VehicleType[];
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface VehicleType {
  id: string;
  name: string;
  price: number;
  description?: string;
}

// Support types
export interface SupportTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  createdAt: string;
  updatedAt: string;
  responses: SupportResponse[];
}

export interface SupportResponse {
  id: string;
  message: string;
  isFromUser: boolean;
  createdAt: string;
  attachments?: string[];
}

// QR Scanner types
export interface QRScanResult {
  type: 'payment' | 'delivery' | 'toll' | 'unknown';
  data: string;
  metadata?: Record<string, any>;
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

// Loading states
export interface LoadingState {
  [key: string]: boolean;
}

// Network status
export interface NetworkInfo {
  isConnected: boolean;
  type?: string;
  isInternetReachable?: boolean;
}

// Device info (for analytics and debugging)
export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  buildNumber: string;
  deviceId: string;
  model: string;
}

// Analytics event types
export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  screen?: string;
}