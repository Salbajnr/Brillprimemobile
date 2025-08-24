
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class MobileOfflineService {
  private static instance: MobileOfflineService;
  private readonly queueKey = 'offline_queue';
  private readonly maxRetries = 3;
  private isProcessing = false;

  static getInstance(): MobileOfflineService {
    if (!this.instance) {
      this.instance = new MobileOfflineService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Listen for network changes
      NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isProcessing) {
          this.processQueue();
        }
      });

      console.log('✅ Offline service initialized');
    } catch (error) {
      console.error('❌ Offline service initialization failed:', error);
    }
  }

  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const newAction: OfflineAction = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queue = await this.getQueue();
      queue.push(newAction);
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(queue));

      console.log(`📝 Offline action queued: ${action.type} ${action.endpoint}`);
    } catch (error) {
      console.error('❌ Failed to queue offline action:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const networkState = await NetInfo.fetch();
      
      if (!networkState.isConnected) {
        console.log('📱 No network connection, skipping queue processing');
        return;
      }

      const queue = await this.getQueue();
      if (queue.length === 0) return;

      console.log(`🔄 Processing ${queue.length} offline actions`);

      const processedActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await this.executeAction(action);
          processedActions.push(action.id);
          console.log(`✅ Processed offline action: ${action.type} ${action.endpoint}`);
        } catch (error) {
          console.error(`❌ Failed to process action ${action.id}:`, error);
          
          if (action.retryCount < this.maxRetries) {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1,
            });
          } else {
            console.error(`💀 Action ${action.id} exceeded max retries, discarding`);
          }
        }
      }

      // Update queue with only failed actions that haven't exceeded retry limit
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(failedActions));
      console.log(`📋 Queue processed: ${processedActions.length} success, ${failedActions.length} failed`);

    } catch (error) {
      console.error('❌ Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    const method = this.getHttpMethod(action.type);
    const response = await fetch(`http://0.0.0.0:5000/api${action.endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: action.data ? JSON.stringify(action.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private getHttpMethod(actionType: string): string {
    switch (actionType) {
      case 'CREATE': return 'POST';
      case 'UPDATE': return 'PUT';
      case 'DELETE': return 'DELETE';
      default: return 'POST';
    }
  }

  private async getQueue(): Promise<OfflineAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.queueKey);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('❌ Failed to get offline queue:', error);
      return [];
    }
  }

  async getQueuedActionsCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.queueKey);
      console.log('🗑️ Offline queue cleared');
    } catch (error) {
      console.error('❌ Failed to clear offline queue:', error);
    }
  }

  async getQueueStatus(): Promise<{
    totalActions: number;
    pendingActions: number;
    failedActions: number;
  }> {
    const queue = await this.getQueue();
    const failedActions = queue.filter(action => action.retryCount > 0);
    
    return {
      totalActions: queue.length,
      pendingActions: queue.length - failedActions.length,
      failedActions: failedActions.length,
    };
  }
}

export const mobileOfflineService = MobileOfflineService.getInstance();
export default mobileOfflineService;
