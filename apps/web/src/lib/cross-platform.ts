/**
 * Cross-platform integration utilities for web app
 * Demonstrates how to use shared packages in your existing codebase
 */

import { Platform, Storage, formatCurrency, validateEmail, generateId } from '@packages/shared';
import { ApiClient } from '@packages/api-client';
import { COLORS, APP_CONFIG } from '@packages/constants';

// Platform-aware storage service for web app
export const webStorage = {
  async saveUser(user: any) {
    await Storage.setObject('user', user);
    console.log(`Saved user data on ${Platform.OS} platform`);
  },
  
  async getUser() {
    const user = await Storage.getObject('user');
    console.log(`Retrieved user data on ${Platform.OS} platform`);
    return user;
  },
  
  async savePreferences(prefs: any) {
    await Storage.setObject('preferences', prefs);
  }
};

// Enhanced currency formatting for Nigerian market
export const formatNigerianCurrency = (amount: number) => {
  return formatCurrency(amount, 'NGN', 'en-NG');
};

// Enhanced form validation using shared utilities
export const validateUserInput = {
  email: (email: string) => validateEmail(email),
  
  phoneNumber: (phone: string) => {
    // Nigerian phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      return { isValid: true };
    }
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Please enter a valid Nigerian phone number' };
  }
};

// Unified API client instance for web app
export const webApiClient = new ApiClient({
  baseUrl: APP_CONFIG.api.baseUrl,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    'X-Platform': Platform.OS,
    'X-Client-Type': 'web'
  }
});

// Cross-platform utilities for web-specific features
export const webUtils = {
  generateTransactionId: () => generateId(),
  
  getPlatformInfo: () => ({
    platform: Platform.OS,
    isMobile: Platform.isMobile,
    isDesktop: Platform.isDesktop,
    userAgent: navigator.userAgent
  }),
  
  formatPriceDisplay: (amount: number) => {
    return `${formatNigerianCurrency(amount)} NGN`;
  },
  
  getThemeColors: () => COLORS
};

// Enhanced notification system using platform detection
export const crossPlatformNotifications = {
  show: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (Platform.isMobile) {
      // Mobile-optimized notifications
      console.log(`Mobile notification (${type}): ${message}`);
    } else {
      // Desktop notifications
      console.log(`Desktop notification (${type}): ${message}`);
    }
  }
};

export default {
  webStorage,
  formatNigerianCurrency,
  validateUserInput,
  webApiClient,
  webUtils,
  crossPlatformNotifications
};