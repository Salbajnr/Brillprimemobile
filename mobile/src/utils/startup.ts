
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { Alert } from 'react-native';

export interface StartupConfig {
  hasCompletedOnboarding: boolean;
  userSession: any;
  serverHealthy: boolean;
  appVersion: string;
}

export class StartupManager {
  static async initialize(): Promise<StartupConfig> {
    console.log('🚀 Initializing BrillPrime Mobile App...');
    
    try {
      // Check local storage
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      const userSession = await AsyncStorage.getItem('userSession');
      
      // Check server health
      let serverHealthy = false;
      try {
        const healthResponse = await apiService.get('/mobile/health');
        serverHealthy = healthResponse.success;
        console.log('✅ Server health check passed');
      } catch (error) {
        console.warn('⚠️ Server health check failed:', error);
        serverHealthy = false;
      }

      const config: StartupConfig = {
        hasCompletedOnboarding: !!hasCompletedOnboarding,
        userSession: userSession ? JSON.parse(userSession) : null,
        serverHealthy,
        appVersion: '1.0.0',
      };

      console.log('📱 Mobile app startup config:', config);
      return config;
      
    } catch (error) {
      console.error('💥 Startup initialization failed:', error);
      throw error;
    }
  }

  static async clearAppData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'hasCompletedOnboarding',
        'userSession',
        'cachedUserData',
        'appSettings',
      ]);
      console.log('🧹 App data cleared');
    } catch (error) {
      console.error('Error clearing app data:', error);
      throw error;
    }
  }

  static async validateBackendConnection(): Promise<boolean> {
    try {
      const response = await apiService.healthCheck();
      return response.success;
    } catch (error) {
      console.error('Backend connection validation failed:', error);
      return false;
    }
  }

  static showConnectionError(): void {
    Alert.alert(
      'Connection Error',
      'Unable to connect to BrillPrime servers. Please check your internet connection and try again.',
      [
        {
          text: 'Retry',
          onPress: () => StartupManager.validateBackendConnection(),
        },
        {
          text: 'Continue Offline',
          style: 'cancel',
        },
      ]
    );
  }
}

export default StartupManager;
