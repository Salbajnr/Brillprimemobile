// Auth slice for Redux store
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, ApiResponse } from '../../types';
import apiService from '../../services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  selectedRole: UserRole | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  selectedRole: null,
  token: null,
  loading: false,
  error: null,
  isInitialized: false,
};

// Async thunks
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }) => {
    const response = await apiService.signUp(userData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sign up failed');
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: { email: string; password: string }) => {
    const response = await apiService.signIn(credentials);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sign in failed');
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (data: { email: string; otp: string; purpose: 'signup' | 'reset' }) => {
    const response = await apiService.verifyOTP(data);
    if (response.success) {
      return response;
    }
    throw new Error(response.message || 'OTP verification failed');
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string) => {
    const response = await apiService.forgotPassword(email);
    if (response.success) {
      return response;
    }
    throw new Error(response.message || 'Password reset request failed');
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await apiService.signOut();
  await AsyncStorage.multiRemove(['auth_token', 'user_data']);
});

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    try {
      const [token, userData] = await AsyncStorage.multiGet(['auth_token', 'user_data']);
      
      if (token[1] && userData[1]) {
        const user = JSON.parse(userData[1]);
        return { token: token[1], user };
      }
      
      return null;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return null;
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedRole: (state, action: PayloadAction<UserRole>) => {
      state.selectedRole = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.selectedRole = action.payload.user.role;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign up failed';
      })
      
      // Sign In
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.selectedRole = action.payload.user.role;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign in failed';
      })
      
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state) => {
        state.loading = false;
        // Update user verification status if needed
        if (state.user) {
          state.user.isVerified = true;
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'OTP verification failed';
      })
      
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Password reset failed';
      })
      
      // Sign Out
      .addCase(signOut.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.selectedRole = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })
      
      // Initialize Auth
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isInitialized = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          state.selectedRole = action.payload.user.role;
        }
      });
  },
});

export const { clearError, setSelectedRole, updateUser, setLoading } = authSlice.actions;
export default authSlice.reducer;