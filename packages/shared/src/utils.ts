
// Cross-platform utility functions
import { VALIDATION, ORDER_STATUSES, USER_ROLES } from './constants';
import type { Order, User, Location } from './types';

// Validation utilities
export const validateEmail = (email: string): boolean => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION.PHONE_REGEX.test(phone);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
};

export const validateOTP = (otp: string): boolean => {
  return otp.length === VALIDATION.OTP_LENGTH && /^\d+$/.test(otp);
};

// Formatting utilities
export const formatCurrency = (amount: number, currency = '₦'): string => {
  return `${currency}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format Nigerian numbers
  if (digits.startsWith('234')) {
    return `+${digits}`;
  } else if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  } else if (digits.length === 10) {
    return `+234${digits}`;
  }
  
  return phone;
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return `${formatDate(date)} at ${formatTime(date)}`;
};

export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffInMs = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diffInMs / (1000 * 60));
  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDate(date);
};

// Order utilities
export const getOrderStatusColor = (status: keyof typeof ORDER_STATUSES): string => {
  switch (status) {
    case 'PENDING':
      return '#FF9500';
    case 'CONFIRMED':
      return '#007AFF';
    case 'PREPARING':
      return '#5856D6';
    case 'READY':
      return '#34C759';
    case 'OUT_FOR_DELIVERY':
      return '#FF9500';
    case 'DELIVERED':
      return '#34C759';
    case 'CANCELLED':
      return '#FF3B30';
    default:
      return '#6D6D80';
  }
};

export const getOrderStatusText = (status: keyof typeof ORDER_STATUSES): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending Confirmation';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PREPARING':
      return 'Being Prepared';
    case 'READY':
      return 'Ready for Pickup';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Unknown Status';
  }
};

export const calculateOrderTotal = (order: Order): number => {
  return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// User utilities
export const getUserDisplayName = (user: User): string => {
  return user.name || user.email.split('@')[0];
};

export const getUserRoleDisplay = (role: keyof typeof USER_ROLES): string => {
  switch (role) {
    case 'CONSUMER':
      return 'Customer';
    case 'MERCHANT':
      return 'Merchant';
    case 'DRIVER':
      return 'Driver';
    case 'ADMIN':
      return 'Administrator';
    default:
      return 'User';
  }
};

// Location utilities
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.latitude * Math.PI) / 180) *
      Math.cos((loc2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
};

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

// Platform-specific utilities
export const isWebPlatform = (): boolean => {
  return typeof window !== 'undefined' && !window.ReactNativeWebView;
};

export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
};

// Error handling utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

export const createApiError = (message: string, status?: number) => {
  const error = new Error(message);
  (error as any).status = status;
  return error;
};

// File utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1) >>> 0) + 1;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Color utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
