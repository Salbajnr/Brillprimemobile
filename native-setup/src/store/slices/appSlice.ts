import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isInitialized: boolean;
  isOnboarded: boolean;
  theme: 'light' | 'dark';
  language: string;
  networkStatus: 'online' | 'offline';
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  isInitialized: false,
  isOnboarded: false,
  theme: 'light',
  language: 'en',
  networkStatus: 'online',
  loading: false,
  error: null,
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
} = appSlice.actions;

export default appSlice.reducer;