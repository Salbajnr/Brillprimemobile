
import { useState, useCallback } from 'react';
import { ApiService } from '../api/apiService';

export interface User {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';
  isVerified: boolean;
  profilePicture?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(apiService: ApiService) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data?.user) {
        setAuthState({
          user: response.data.user,
          isLoading: false,
          error: null,
        });
        return { success: true, user: response.data.user };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed',
        }));
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [apiService]);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.register(userData);
      
      if (response.success) {
        setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
        return { success: true, data: response.data };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Registration failed',
        }));
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [apiService]);

  const verifyOTP = useCallback(async (email: string, otp: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.verifyOTP({ email, otp });
      
      if (response.success && response.data?.user) {
        setAuthState({
          user: response.data.user,
          isLoading: false,
          error: null,
        });
        return { success: true, user: response.data.user };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'OTP verification failed',
        }));
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'OTP verification failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [apiService]);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await apiService.logout();
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (error: any) {
      // Even if logout API fails, clear local state
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
      });
      return { success: true };
    }
  }, [apiService]);

  const updateProfile = useCallback(async (profileData: Partial<User>) => {
    if (!authState.user) return { success: false, error: 'Not authenticated' };

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.updateProfile(profileData);
      
      if (response.success && response.data) {
        const updatedUser = { ...authState.user, ...response.data };
        setAuthState({
          user: updatedUser,
          isLoading: false,
          error: null,
        });
        return { success: true, user: updatedUser };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Profile update failed',
        }));
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Profile update failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [apiService, authState.user]);

  const refreshUser = useCallback(async () => {
    if (!authState.user) return { success: false, error: 'Not authenticated' };

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data) {
        setAuthState({
          user: response.data,
          isLoading: false,
          error: null,
        });
        return { success: true, user: response.data };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to refresh user data',
        }));
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh user data';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [apiService, authState.user]);

  return {
    ...authState,
    login,
    register,
    verifyOTP,
    logout,
    updateProfile,
    refreshUser,
    isAuthenticated: !!authState.user,
  };
}
