
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LocationPermission {
  granted: boolean;
  message?: string;
}

interface CameraPermission {
  granted: boolean;
  message?: string;
}

interface PushNotificationPermission {
  granted: boolean;
  token?: string;
}

interface BiometricPermission {
  available: boolean;
  type?: 'TouchID' | 'FaceID' | 'Fingerprint' | 'None';
}

interface NativeConfiguration {
  apiBaseUrl: string;
  websocketUrl: string;
  paystackPublicKey: string;
  googleMapsApiKey: string;
  firebaseConfig: {
    projectId: string;
    appId: string;
    apiKey: string;
  };
}

interface AppState {
  isFirstLaunch: boolean;
  permissions: {
    location: LocationPermission;
    camera: CameraPermission;
    pushNotifications: PushNotificationPermission;
    biometric: BiometricPermission;
  };
  configuration: NativeConfiguration;
  networkStatus: 'online' | 'offline';
  theme: 'light' | 'dark';
}

const initialState: AppState = {
  isFirstLaunch: true,
  permissions: {
    location: { granted: false },
    camera: { granted: false },
    pushNotifications: { granted: false },
    biometric: { available: false, type: 'None' },
  },
  configuration: {
    apiBaseUrl: 'http://localhost:5000',
    websocketUrl: 'ws://localhost:5000',
    paystackPublicKey: '',
    googleMapsApiKey: '',
    firebaseConfig: {
      projectId: '',
      appId: '',
      apiKey: '',
    },
  },
  networkStatus: 'online',
  theme: 'light',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
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
    updateConfiguration: (state, action: PayloadAction<Partial<NativeConfiguration>>) => {
      state.configuration = { ...state.configuration, ...action.payload };
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setFirstLaunch,
  updateLocationPermission,
  updateCameraPermission,
  updatePushNotificationPermission,
  updateBiometricPermission,
  updateConfiguration,
  setNetworkStatus,
  setTheme,
} = appSlice.actions;

export default appSlice.reducer;
