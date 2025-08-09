import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
  totalFiles?: number;
  syncedFiles?: number;
  failedFiles?: number;
}

interface AppState {
  isInitialized: boolean;
  isOnboarded: boolean;
  theme: 'light' | 'dark';
  language: string;
  networkStatus: 'online' | 'offline';
  loading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  fileSync: {
    autoSyncEnabled: boolean;
    syncInterval: number;
    lastFullSync: number;
    cacheSize: number;
    maxCacheSize: number;
  };
}

const initialState: AppState = {
  isInitialized: false,
  isOnboarded: false,
  theme: 'light',
  language: 'en',
  networkStatus: 'online',
  loading: false,
  error: null,
  syncStatus: {
    isOnline: false,
    lastSyncTime: 0,
    syncInProgress: false,
    totalFiles: 0,
    syncedFiles: 0,
    failedFiles: 0,
  },
  fileSync: {
    autoSyncEnabled: true,
    syncInterval: 30000, // 30 seconds
    lastFullSync: 0,
    cacheSize: 0,
    maxCacheSize: 100 * 1024 * 1024, // 100MB
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setOnboarded: (state, action: PayloadAction<boolean>) => {
      state.isOnboarded = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    incrementNotifications: (state) => {
      state.notifications.unreadCount += 1;
    },
    updateSyncStatus: (state, action: PayloadAction<Partial<SyncStatus>>) => {
      state.syncStatus = { ...state.syncStatus, ...action.payload };
    },
    updateFileSyncConfig: (state, action: PayloadAction<Partial<AppState['fileSync']>>) => {
      state.fileSync = { ...state.fileSync, ...action.payload };
    },
    setSyncProgress: (state, action: PayloadAction<{ total: number; completed: number; failed: number }>) => {
      const { total, completed, failed } = action.payload;
      state.syncStatus.totalFiles = total;
      state.syncStatus.syncedFiles = completed;
      state.syncStatus.failedFiles = failed;
      state.syncStatus.syncInProgress = completed < total;
    },
  },
});

export const {
  setInitialized,
  setOnboarded,
  setTheme,
  setLanguage,
  setNetworkStatus,
  setLoading,
  setError,
  clearError,
  incrementNotifications,
  updateSyncStatus,
  updateFileSyncConfig,
  setSyncProgress,
} = appSlice.actions;

export default appSlice.reducer;