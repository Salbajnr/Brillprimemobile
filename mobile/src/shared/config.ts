
export const mobileConfig = {
  // API Configuration
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://0.0.0.0:5000/api',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'ws://0.0.0.0:5000',
  
  // Storage Keys
  storageKeys: {
    userSession: 'userSession',
    userPreferences: 'userPreferences',
    cachedData: 'cachedData',
    deviceInfo: 'deviceInfo',
  },
  
  // Request Configuration
  requestTimeout: 30000,
  maxRetries: 3,
  
  // Cache Configuration
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  
  // Feature Flags
  features: {
    biometrics: true,
    pushNotifications: true,
    backgroundLocation: true,
    offlineMode: true,
    analytics: true,
  },
  
  // Native Features
  permissions: {
    camera: true,
    location: true,
    notifications: true,
    storage: true,
  },
  
  // UI Configuration
  theme: {
    primaryColor: '#1E40AF',
    secondaryColor: '#F3F4F6',
    dangerColor: '#DC2626',
    successColor: '#059669',
    warningColor: '#D97706',
  },
  
  // Map Configuration
  map: {
    initialRegion: {
      latitude: 9.0765,
      longitude: 7.3986,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
  },
};

export default mobileConfig;
