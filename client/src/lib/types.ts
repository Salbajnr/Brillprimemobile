// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'merchant' | 'driver' | 'admin';
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Business Types
export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  isActive: boolean;
  rating: number;
  totalReviews: number;
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order Types
export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  customer: User;
  businessId: string;
  business: Business;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  driverId?: string;
  driver?: User;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface Analytics {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
}

// Form Input Types
export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  isActive: boolean;
}

export interface CreateOrderInput {
  customerId: string;
  businessId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: string;
  notes?: string;
}

export interface UpdateOrderInput {
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  driverId?: string;
  estimatedDeliveryTime?: string;
  notes?: string;
}

// Dashboard Summary Types
export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  todaysSales: number;
  activeOrders: number;
  inventoryLevel: number;
}

export interface BusinessSummary {
  business: Business;
  metrics: DashboardMetrics;
  recentOrders: Order[];
  topProducts: (Product & { totalSold: number; revenue: number })[];
  lowStockProducts: Product[];
  pendingOrders: number;
  activeOrders: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

// Location Types
export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

// Driver Types
export interface Driver extends User {
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  isAvailable: boolean;
  currentLocation?: Location;
  rating: number;
  totalDeliveries: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  orderId?: string;
  message: string;
  type: 'text' | 'image' | 'location';
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  participants: User[];
  orderId?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}