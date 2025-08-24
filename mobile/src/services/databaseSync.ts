import { apiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Assuming mobileConfig and other necessary imports are available in the actual environment
// For demonstration purposes, let's define a placeholder for mobileConfig
const mobileConfig = {
  apiBaseUrl: 'http://localhost:3000/api', // Example API base URL
};

// Placeholder for the actual apiService in the mobile context if it differs from the web
// If apiService is shared, this might not be needed, or it might need to be adapted.
// For this example, we assume apiService is available and works for mobile as well.
// If specific mobile API calls are needed, they should be implemented here or in a separate mobile-specific service.

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
      // Assuming apiService is configured to handle mobile requests or is a shared service
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

// Mobile specific sync service
class MobileDatabaseSyncService {
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  async syncWithServer(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      // Get last sync timestamp
      const lastSync = await AsyncStorage.getItem('lastSyncTimestamp');
      const syncTimestamp = lastSync ? new Date(lastSync) : null;

      // Check server connection first
      await this.verifyServerConnection();

      // Sync user data
      await this.syncUserData(syncTimestamp);

      // Sync orders
      await this.syncOrders(syncTimestamp);

      // Sync transactions
      await this.syncTransactions(syncTimestamp);

      // Sync categories
      await this.syncCategories();

      // Sync products
      await this.syncProducts(syncTimestamp);

      // Sync notifications
      await this.syncNotifications(syncTimestamp);

      // Update last sync timestamp
      const now = new Date();
      await AsyncStorage.setItem('lastSyncTimestamp', now.toISOString());
      this.lastSyncTimestamp = now;

      // Reset retry count on success
      this.retryCount = 0;

      console.log('Database sync completed successfully');
    } catch (error) {
      console.error('Database sync failed:', error);

      // Implement retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying sync... (${this.retryCount}/${this.maxRetries})`);
        // Using setTimeout for retry, consider a more robust backoff strategy
        setTimeout(() => this.syncWithServer(), 5000 * this.retryCount);
      }

      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async verifyServerConnection(): Promise<void> {
    try {
      // Using fetch directly for health check as it might be a simpler endpoint
      const response = await fetch(`${mobileConfig.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Setting a timeout for the health check
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`Server health check failed with status: ${response.status}`);
      }
      console.log('Server connection verified.');
    } catch (error: any) {
      console.error('Cannot connect to server:', error.message);
      throw new Error('Cannot connect to server');
    }
  }

  private async syncUserData(syncTimestamp: Date | null): Promise<void> {
    try {
      // Assuming user data sync is handled by apiService or another method
      // For demonstration, using a placeholder call
      const response = await apiService.get('/users/me', { since: syncTimestamp?.toISOString() });
      if (response.success) {
        await AsyncStorage.setItem('cached_user_data', JSON.stringify(response.data));
        console.log('User data synced successfully');
      } else {
        console.warn('User data sync failed:', response.error);
      }
    } catch (error: any) {
      console.warn('User data sync failed:', error.message);
    }
  }

  private async syncOrders(syncTimestamp: Date | null): Promise<void> {
    try {
      // Assuming orders sync is handled by apiService or another method
      // For demonstration, using a placeholder call
      const response = await apiService.get('/orders', { since: syncTimestamp?.toISOString() });
      if (response.success) {
        await AsyncStorage.setItem('cached_orders', JSON.stringify(response.data));
        console.log('Orders synced successfully');
      } else {
        console.warn('Orders sync failed:', response.error);
      }
    } catch (error: any) {
      console.warn('Orders sync failed:', error.message);
    }
  }

  private async syncTransactions(syncTimestamp: Date | null): Promise<void> {
    try {
      // Assuming transactions sync is handled by apiService or another method
      // For demonstration, using a placeholder call
      const response = await apiService.get('/transactions', { since: syncTimestamp?.toISOString() });
      if (response.success) {
        await AsyncStorage.setItem('cached_transactions', JSON.stringify(response.data));
        console.log('Transactions synced successfully');
      } else {
        console.warn('Transactions sync failed:', response.error);
      }
    } catch (error: any) {
      console.warn('Transactions sync failed:', error.message);
    }
  }


  private async syncCategories(): Promise<void> {
    try {
      const response = await fetch(`${mobileConfig.apiBaseUrl}/categories`);
      if (!response.ok) {
        console.warn(`Categories sync failed with status: ${response.status}`);
        return;
      }

      const categories = await response.json();
      await AsyncStorage.setItem('cached_categories', JSON.stringify(categories));
      console.log('Categories synced successfully');
    } catch (error: any) {
      console.warn('Categories sync failed:', error.message);
    }
  }

  private async syncProducts(syncTimestamp: Date | null): Promise<void> {
    try {
      const url = syncTimestamp
        ? `${mobileConfig.apiBaseUrl}/products?since=${syncTimestamp.toISOString()}`
        : `${mobileConfig.apiBaseUrl}/products`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Products sync failed with status: ${response.status}`);
        return;
      }

      const products = await response.json();

      // Merge with existing cached products
      const existingProducts = await AsyncStorage.getItem('cached_products');
      const existing = existingProducts ? JSON.parse(existingProducts) : [];

      // Simple merge logic - in production, implement proper conflict resolution
      const merged = [...existing, ...products.data];
      const unique = merged.filter((item, index, arr) =>
        arr.findIndex(p => p.id === item.id) === index
      );

      await AsyncStorage.setItem('cached_products', JSON.stringify(unique));
      console.log('Products synced successfully');
    } catch (error: any) {
      console.warn('Products sync failed:', error.message);
    }
  }

  private async syncNotifications(syncTimestamp: Date | null): Promise<void> {
    try {
      const url = syncTimestamp
        ? `${mobileConfig.apiBaseUrl}/notifications?since=${syncTimestamp.toISOString()}`
        : `${mobileConfig.apiBaseUrl}/notifications`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Notifications sync failed with status: ${response.status}`);
        return;
      }

      const notifications = await response.json();
      await AsyncStorage.setItem('cached_notifications', JSON.stringify(notifications.data));
      console.log('Notifications synced successfully');
    } catch (error: any) {
      console.warn('Notifications sync failed:', error.message);
    }
  }

  async forceSyncAll(): Promise<void> {
    // Clear last sync timestamp to force full sync
    await AsyncStorage.removeItem('lastSyncTimestamp');
    console.log('Forcing full database sync...');
    return this.syncWithServer();
  }

  getSyncStatus(): {
    inProgress: boolean;
    lastSync: Date | null;
    retryCount: number;
  } {
    return {
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncTimestamp,
      retryCount: this.retryCount,
    };
  }
}

// Exporting both services for potential use cases
export const databaseSyncService = DatabaseSyncService.getInstance();
export const mobileDatabaseSyncService = new MobileDatabaseSyncService();