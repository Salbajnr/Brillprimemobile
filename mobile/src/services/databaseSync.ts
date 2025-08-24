
import { apiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class DatabaseSyncService {
  private static instance: DatabaseSyncService;

  public static getInstance(): DatabaseSyncService {
    if (!DatabaseSyncService.instance) {
      DatabaseSyncService.instance = new DatabaseSyncService();
    }
    return DatabaseSyncService.instance;
  }

  // Verify that mobile app can access same data as web app
  async verifySyncStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.get('/mobile/sync-test');
      
      if (response.success) {
        // Store sync status locally
        await AsyncStorage.setItem('lastSyncVerification', JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'verified',
          data: response.data
        }));

        console.log('✅ Database sync verified:', response.data);
      }

      return response;
    } catch (error: any) {
      console.error('❌ Database sync verification failed:', error);
      return {
        success: false,
        error: error.message || 'Sync verification failed'
      };
    }
  }

  // Get last sync status from local storage
  async getLastSyncStatus(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem('lastSyncVerification');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  // Verify specific data consistency
  async verifyDataConsistency(userId: number): Promise<boolean> {
    try {
      const response = await apiService.get('/mobile/sync-test');
      
      if (response.success && response.data?.user?.id === userId) {
        console.log('✅ Data consistency verified for user:', userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Data consistency check failed:', error);
      return false;
    }
  }
}

export const databaseSyncService = DatabaseSyncService.getInstance();
