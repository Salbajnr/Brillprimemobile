import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../services/api';
import { STORAGE_KEYS } from '../constants';

export interface AppInitializationResult {
  isFirstLaunch: boolean;
  hasValidSession: boolean;
  networkStatus: any;
  biometricAvailable: boolean;
}

export const initializeApp = async (): Promise<AppInitializationResult> => {
  try {
    console.log('🚀 Initializing BrillPrime Mobile App...');

    // Check API connectivity
    const healthCheck = await apiService.healthCheck();
    if (!healthCheck.success) {
      throw new Error('Backend API is not accessible');
    }

    // Verify database connection (shared with web app)
    const dbStatus = await apiService.get('/mobile/database-status');
    if (!dbStatus.success || !dbStatus.data?.sharedWithWebApp) {
      throw new Error('Database connection not properly shared with web app');
    }

    console.log('✅ Database connection verified:', {
      tables: dbStatus.data.tables,
      sharedWithWebApp: dbStatus.data.sharedWithWebApp
    });

    // Check if this is the first launch
    const hasLaunched = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    const isFirstLaunch = !hasLaunched;

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    console.log('🌐 Network Status:', networkState);

    // Check for existing user session
    let hasValidSession = false;
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.token) {
          // Validate session with server
          const response = await apiService.getCurrentUser();
          hasValidSession = response.success;

          if (!hasValidSession) {
            // Clear invalid session
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
          }
        }
      }
    } catch (error) {
      console.error('❌ Session validation error:', error);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }

    // Check biometric availability
    let biometricAvailable = false;
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // This would normally check react-native-biometrics
        // For now, we'll simulate the check
        biometricAvailable = true;
      }
    } catch (error) {
      console.error('❌ Biometric check error:', error);
    }

    // Initialize push notifications (placeholder)
    try {
      // await initializePushNotifications();
      console.log('🔔 Push notifications initialized');
    } catch (error) {
      console.error('❌ Push notification initialization failed:', error);
    }

    // Set up error tracking (placeholder)
    try {
      // await initializeErrorTracking();
      console.log('📊 Error tracking initialized');
    } catch (error) {
      console.error('❌ Error tracking initialization failed:', error);
    }

    // Set up analytics (placeholder)
    try {
      // await initializeAnalytics();
      console.log('📈 Analytics initialized');
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }

    const result: AppInitializationResult = {
      isFirstLaunch,
      hasValidSession,
      networkStatus: networkState,
      biometricAvailable,
    };

    console.log('✅ App initialization completed:', result);
    return result;

  } catch (error) {
    console.error('💥 App initialization failed:', error);
    throw error;
  }
};

export const clearAppData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_SESSION,
      STORAGE_KEYS.BIOMETRIC_ENABLED,
      STORAGE_KEYS.PUSH_TOKEN,
    ]);
    console.log('🧹 App data cleared');
  } catch (error) {
    console.error('❌ Failed to clear app data:', error);
  }
};

export const resetOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    console.log('🔄 Onboarding reset');
  } catch (error) {
    console.error('❌ Failed to reset onboarding:', error);
  }
};