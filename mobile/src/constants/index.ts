
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_DIMENSIONS = {
  width,
  height,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

export const COLORS = {
  primary: '#1E40AF',
  secondary: '#10B981',
  accent: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

export const FONTS = {
  regular: Platform.OS === 'ios' ? 'System' : 'Roboto-Regular',
  medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://0.0.0.0:5000'
    : 'https://your-production-domain.com',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

export const STORAGE_KEYS = {
  USER_SESSION: 'userSession',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  BIOMETRIC_ENABLED: 'biometricEnabled',
  PUSH_TOKEN: 'pushToken',
  LANGUAGE: 'language',
  THEME: 'theme',
};

export const WEBSOCKET_CONFIG = {
  URL: __DEV__ 
    ? 'ws://0.0.0.0:5000'
    : 'wss://your-production-domain.com',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

export const BIOMETRIC_CONFIG = {
  title: 'Authenticate',
  subtitle: 'Use your biometric to authenticate',
  description: 'Place your finger on the sensor or look at the camera',
  fallbackLabel: 'Use PIN',
  negativeButtonText: 'Cancel',
};

export const FUEL_TYPES = [
  { id: 'petrol', name: 'Petrol (PMS)', price: 617 },
  { id: 'diesel', name: 'Diesel (AGO)', price: 780 },
  { id: 'kerosene', name: 'Kerosene (DPK)', price: 650 },
];

export const VEHICLE_TYPES = [
  { id: 'car', name: 'Car', tollRate: 200 },
  { id: 'suv', name: 'SUV', tollRate: 300 },
  { id: 'truck', name: 'Truck', tollRate: 500 },
  { id: 'motorcycle', name: 'Motorcycle', tollRate: 100 },
  { id: 'bus', name: 'Bus', tollRate: 400 },
];

export const BILL_CATEGORIES = [
  { id: 'electricity', name: 'Electricity', icon: '⚡' },
  { id: 'water', name: 'Water', icon: '💧' },
  { id: 'internet', name: 'Internet', icon: '🌐' },
  { id: 'cable_tv', name: 'Cable TV', icon: '📺' },
  { id: 'mobile_airtime', name: 'Airtime', icon: '📱' },
  { id: 'mobile_data', name: 'Data', icon: '📶' },
];

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const USER_ROLES = {
  CONSUMER: 'CONSUMER',
  DRIVER: 'DRIVER',
  MERCHANT: 'MERCHANT',
  ADMIN: 'ADMIN',
};
