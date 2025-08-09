
// Cross-platform constants
export const APP_CONFIG = {
  NAME: 'BrillPrime',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
  WEBSOCKET_RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  LOCATION_PERMISSION: 'location_permission',
};

export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-app.replit.app'
    : 'http://localhost:3001',
  WEBSOCKET_URL: process.env.NODE_ENV === 'production'
    ? 'wss://your-app.replit.app'
    : 'ws://localhost:3001',
};

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#6D6D80',
  border: '#C6C6C8',
};

export const FONTS = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
  PASSWORD_MIN_LENGTH: 8,
  OTP_LENGTH: 6,
};

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const USER_ROLES = {
  CONSUMER: 'CONSUMER',
  MERCHANT: 'MERCHANT',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

export const NOTIFICATION_TYPES = {
  ORDER_UPDATE: 'ORDER_UPDATE',
  PAYMENT: 'PAYMENT',
  CHAT: 'CHAT',
  SYSTEM: 'SYSTEM',
  PROMOTION: 'PROMOTION',
} as const;

export const WEBSOCKET_EVENTS = {
  // Client to Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  UPDATE_LOCATION: 'update_location',
  
  // Server to Client
  ORDER_UPDATE: 'order_update',
  LOCATION_UPDATE: 'location_update',
  CHAT_MESSAGE: 'chat_message',
  NOTIFICATION: 'notification',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
} as const;

export const PAYMENT_METHODS = {
  CARD: 'card',
  BANK: 'bank',
  WALLET: 'wallet',
} as const;

export const TRANSACTION_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
} as const;

export const PRODUCT_CATEGORIES = [
  'Food & Beverages',
  'Electronics',
  'Fashion',
  'Health & Beauty',
  'Home & Garden',
  'Sports & Recreation',
  'Books & Media',
  'Automotive',
  'Fuel',
  'Services',
] as const;

export const DELIVERY_ZONES = [
  'Lagos Island',
  'Victoria Island',
  'Ikoyi',
  'Lekki',
  'Ajah',
  'Surulere',
  'Yaba',
  'Ikeja',
  'Maryland',
  'Gbagada',
] as const;

// Platform detection utilities
export const PLATFORM = {
  isWeb: typeof window !== 'undefined' && !window.ReactNativeWebView,
  isNative: typeof window !== 'undefined' && !!window.ReactNativeWebView,
  isIOS: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent),
};

export const PERMISSIONS = {
  CAMERA: 'camera',
  LOCATION: 'location',
  NOTIFICATIONS: 'notifications',
  STORAGE: 'storage',
} as const;

export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt'],
  AUDIO: ['mp3', 'wav', 'aac'],
  VIDEO: ['mp4', 'mov', 'avi'],
} as const;

export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  AUDIO: 20 * 1024 * 1024, // 20MB
  VIDEO: 50 * 1024 * 1024, // 50MB
} as const;
