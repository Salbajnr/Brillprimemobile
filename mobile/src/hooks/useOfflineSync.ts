
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { storageService } from '../utils/storage';
import { apiService } from '../services/api';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online ?? false);
      
      if (online && pendingActions.length > 0) {
        syncPendingActions();
      }
    });

    loadPendingActions();
    
    return () => unsubscribe();
  }, []);

  const loadPendingActions = async () => {
    try {
      const actions = await storageService.getItem('offline_actions') || [];
      setPendingActions(actions);
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = async (actions: OfflineAction[]) => {
    try {
      await storageService.setItem('offline_actions', actions);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addOfflineAction = useCallback(async (
    type: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ) => {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      endpoint,
      method,
    };

    const newActions = [...pendingActions, action];
    setPendingActions(newActions);
    await savePendingActions(newActions);
  }, [pendingActions]);

  const syncPendingActions = async () => {
    if (syncing || pendingActions.length === 0) return;

    setSyncing(true);
    const successfulActions: string[] = [];

    for (const action of pendingActions) {
      try {
        switch (action.method) {
          case 'GET':
            await apiService.get(action.endpoint);
            break;
          case 'POST':
            await apiService.post(action.endpoint, action.data);
            break;
          case 'PUT':
            await apiService.put(action.endpoint, action.data);
            break;
          case 'DELETE':
            await apiService.delete(action.endpoint);
            break;
        }
        successfulActions.push(action.id);
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        // For now, we'll keep failed actions for retry
        // In production, you might want to implement exponential backoff
      }
    }

    // Remove successful actions
    const remainingActions = pendingActions.filter(
      action => !successfulActions.includes(action.id)
    );
    setPendingActions(remainingActions);
    await savePendingActions(remainingActions);
    setSyncing(false);
  };

  const clearPendingActions = async () => {
    setPendingActions([]);
    await storageService.removeItem('offline_actions');
  };

  return {
    isOnline,
    pendingActions: pendingActions.length,
    syncing,
    addOfflineAction,
    syncPendingActions,
    clearPendingActions,
  };
};
