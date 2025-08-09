// App slice for global app state
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocationPermission, CameraPermission, PushNotificationPermission, BiometricPermission } from '../../types';

interface AppState {
  isOnboarded: boolean;
  permissions: {
    location: LocationPermission;
    camera: CameraPermission;
    pushNotifications: PushNotificationPermission;
    biometric: BiometricPermission;
  };
  networkStatus: {
    isConnected: boolean;
    isInternetReachable: boolean;
  };
  appVersion: string;
  apiBaseUrl: string;
  websocketUrl: string;
  theme: 'light' | 'dark';
  language: string;
  currency: string;
  pushNotificationToken: string | null;
}

const initialState: AppState = {
  isOnboarded: false,
  permissions: {
    location: { granted: false },
    camera: { granted: false },
    pushNotifications: { granted: false },
    biometric: { available: false },
  },
  networkStatus: {
    isConnected: true,
    isInternetReachable: true,
  },
  appVersion: '1.0.0',
  apiBaseUrl: 'http://localhost:5000',
  websocketUrl: 'ws://localhost:5000',
  theme: 'light',
  language: 'en',
  currency: 'NGN',
  pushNotificationToken: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnboarded: (state, action: PayloadAction<boolean>) => {
      state.isOnboarded = action.payload;
    },
    
    updateLocationPermission: (state, action: PayloadAction<LocationPermission>) => {
      state.permissions.location = action.payload;
    },
    
    updateCameraPermission: (state, action: PayloadAction<CameraPermission>) => {
      state.permissions.camera = action.payload;
    },
    
    updatePushNotificationPermission: (state, action: PayloadAction<PushNotificationPermission>) => {
      state.permissions.pushNotifications = action.payload;
    },
    
    updateBiometricPermission: (state, action: PayloadAction<BiometricPermission>) => {
      state.permissions.biometric = action.payload;
    },
    
    updateNetworkStatus: (state, action: PayloadAction<{ isConnected: boolean; isInternetReachable: boolean }>) => {
      state.networkStatus = action.payload;
    },
    
    setApiBaseUrl: (state, action: PayloadAction<string>) => {
      state.apiBaseUrl = action.payload;
    },
    
    setWebsocketUrl: (state, action: PayloadAction<string>) => {
      state.websocketUrl = action.payload;
    },
    
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },
    
    setPushNotificationToken: (state, action: PayloadAction<string | null>) => {
      state.pushNotificationToken = action.payload;
    },
    
    updateAppVersion: (state, action: PayloadAction<string>) => {
      state.appVersion = action.payload;
    },
  },
});

export const {
  setOnboarded,
  updateLocationPermission,
  updateCameraPermission,
  updatePushNotificationPermission,
  updateBiometricPermission,
  updateNetworkStatus,
  setApiBaseUrl,
  setWebsocketUrl,
  setTheme,
  setLanguage,
  setCurrency,
  setPushNotificationToken,
  updateAppVersion,
} = appSlice.actions;

export default appSlice.reducer;