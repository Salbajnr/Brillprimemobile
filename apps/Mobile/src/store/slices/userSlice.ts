import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  profile: any | null;
  settings: any;
  preferences: any;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  settings: {
    notifications: true,
    biometrics: false,
    theme: 'light',
  },
  preferences: {
    language: 'en',
    currency: 'NGN',
  },
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setProfile: (state, action: PayloadAction<any>) => {
      state.profile = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<any>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateSettings: (state, action: PayloadAction<any>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    updatePreferences: (state, action: PayloadAction<any>) => {
      state.preferences = { ...state.preferences, ...action.payload };
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
  setLoading,
  setProfile,
  updateProfile,
  updateSettings,
  updatePreferences,
  setError,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;