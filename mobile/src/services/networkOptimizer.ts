
import NetInfo from '@react-native-community/netinfo';
import { mobileCacheService } from './cache';

interface NetworkState {
  isConnected: boolean;
  type: string;
  isWifiEnabled: boolean;
  details: any;
}

class MobileNetworkOptimizer {
  private networkState: NetworkState | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.networkState = {
        isConnected: state.isConnected || false,
        type: state.type,
        isWifiEnabled: state.type === 'wifi',
        details: state.details
      };

      if (this.networkState.isConnected && !this.isProcessingQueue) {
        this.processRequestQueue();
      }
    });
  }

  async optimizeRequest(requestFn: () => Promise<any>, cacheKey?: string): Promise<any> {
    // Check cache first
    if (cacheKey) {
      const cached = await mobileCacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // If offline, queue the request
    if (!this.networkState?.isConnected) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await requestFn();
            if (cacheKey) {
              await mobileCacheService.set(cacheKey, result);
            }
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    // Execute request immediately if online
    try {
      const result = await requestFn();
      if (cacheKey) {
        await mobileCacheService.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      // If request fails, try to return cached data
      if (cacheKey) {
        const cached = await mobileCacheService.get(cacheKey);
        if (cached) {
          return cached;
        }
      }
      throw error;
    }
  }

  private async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0 && this.networkState?.isConnected) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Failed to process queued request:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  getNetworkState(): NetworkState | null {
    return this.networkState;
  }

  isSlowConnection(): boolean {
    if (!this.networkState) return false;
    
    return this.networkState.type === 'cellular' && 
           (this.networkState.details as any)?.cellularGeneration === '2g';
  }

  shouldReduceDataUsage(): boolean {
    return !this.networkState?.isWifiEnabled || this.isSlowConnection();
  }
}

export const mobileNetworkOptimizer = new MobileNetworkOptimizer();
