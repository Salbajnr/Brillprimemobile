
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { mobileCacheService } from './cache';

interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class MobileOfflineService {
  private offlineActions: OfflineAction[] = [];
  private isOnline = true;
  private maxRetries = 3;

  constructor() {
    this.initializeNetworkListener();
    this.loadOfflineActions();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      if (wasOffline && this.isOnline) {
        this.processOfflineActions();
      }
    });
  }

  private async loadOfflineActions() {
    try {
      const stored = await AsyncStorage.getItem('offline_actions');
      if (stored) {
        this.offlineActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error);
    }
  }

  private async saveOfflineActions() {
    try {
      await AsyncStorage.setItem('offline_actions', JSON.stringify(this.offlineActions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }

  async queueAction(type: string, payload: any): Promise<string> {
    const action: OfflineAction = {
      id: Date.now().toString(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineActions.push(action);
    await this.saveOfflineActions();

    if (this.isOnline) {
      this.processOfflineActions();
    }

    return action.id;
  }

  private async processOfflineActions() {
    if (!this.isOnline || this.offlineActions.length === 0) return;

    const actionsToProcess = [...this.offlineActions];
    this.offlineActions = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`Failed to execute offline action ${action.id}:`, error);
        
        if (action.retryCount < this.maxRetries) {
          action.retryCount++;
          this.offlineActions.push(action);
        }
      }
    }

    await this.saveOfflineActions();
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    // This would be implemented based on your API structure
    // For now, we'll use a generic approach
    switch (action.type) {
      case 'api_call':
        // Execute the API call
        console.log('Executing offline API call:', action.payload);
        break;
      case 'cache_update':
        await mobileCacheService.set(action.payload.key, action.payload.data);
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  getQueuedActionsCount(): number {
    return this.offlineActions.length;
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const mobileOfflineService = new MobileOfflineService();
