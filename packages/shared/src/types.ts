
// Platform-agnostic types for both web and native
export interface User {
  id: string;
  email: string;
  name: string;
  role: "CONSUMER" | "MERCHANT" | "DRIVER" | "ADMIN";
  phoneNumber?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  merchantId: string;
  imageUrl?: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  merchantId: string;
  driverId?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Merchant {
  id: string;
  name: string;
  description: string;
  address: string;
  phoneNumber: string;
  email: string;
  isVerified: boolean;
  rating: number;
  imageUrl?: string;
  categories: string[];
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  licenseNumber: string;
  isAvailable: boolean;
  rating: number;
  currentLocation?: Location;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type: 'text' | 'image' | 'location';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

// Enums and Union Types
export type UserRole = "CONSUMER" | "MERCHANT" | "DRIVER" | "ADMIN";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type NotificationType = "ORDER_UPDATE" | "PAYMENT" | "CHAT" | "SYSTEM" | "PROMOTION";

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: UserRole;
}

export interface OTPVerification {
  email: string;
  otp: string;
}

// Payment Types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface OrderUpdateEvent extends WebSocketEvent {
  type: 'ORDER_UPDATE';
  data: {
    orderId: string;
    status: OrderStatus;
    driverId?: string;
    estimatedDelivery?: string;
  };
}

export interface LocationUpdateEvent extends WebSocketEvent {
  type: 'LOCATION_UPDATE';
  data: {
    driverId: string;
    location: Location;
  };
}

export interface ChatMessageEvent extends WebSocketEvent {
  type: 'CHAT_MESSAGE';
  data: ChatMessage;
}
