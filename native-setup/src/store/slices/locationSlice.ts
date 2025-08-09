import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LocationState {
  currentLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  savedAddresses: any[];
  tracking: boolean;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  savedAddresses: [],
  tracking: false,
  permissionGranted: false,
  loading: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCurrentLocation: (state, action: PayloadAction<{ latitude: number; longitude: number; address?: string }>) => {
      state.currentLocation = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSavedAddresses: (state, action: PayloadAction<any[]>) => {
      state.savedAddresses = action.payload;
    },
    addSavedAddress: (state, action: PayloadAction<any>) => {
      state.savedAddresses.push(action.payload);
    },
    removeSavedAddress: (state, action: PayloadAction<string>) => {
      state.savedAddresses = state.savedAddresses.filter(
        address => address.id !== action.payload
      );
    },
    setTracking: (state, action: PayloadAction<boolean>) => {
      state.tracking = action.payload;
    },
    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
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
  setCurrentLocation,
  setSavedAddresses,
  addSavedAddress,
  removeSavedAddress,
  setTracking,
  setPermissionGranted,
  setError,
  clearError,
} = locationSlice.actions;

export default locationSlice.reducer;