
// Mobile app configuration
export const mobileConfig = {
  // API endpoints for mobile
  apiVersion: 'v1',
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api' 
    : 'http://localhost:5000/api',
  
  // Mobile-specific settings
  enablePushNotifications: true,
  enableBiometrics: true,
  cacheTimeout: 300000, // 5 minutes
  
  // Real-time features
  websocketUrl: process.env.NODE_ENV === 'production'
    ? 'wss://your-domain.com'
    : 'ws://localhost:5000',
  
  // Security settings
  jwtExpiryTime: '7d',
  refreshTokenExpiryTime: '30d',
};

// Export mobile-specific middleware and configurations
export default mobileConfig;
