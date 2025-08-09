import { create } from "zustand";
import { apiService } from "@/services/sharedServices";
import { localStorage } from "@/lib/storage";

interface User {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  role: "CONSUMER" | "MERCHANT" | "DRIVER" | "ADMIN";
  isVerified: boolean;
  profilePicture?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  selectedRole: "CONSUMER" | "MERCHANT" | "DRIVER" | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  resendOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  refreshUser: () => Promise<{ success: boolean; user?: User; error?: string }>;
  setSelectedRole: (role: "CONSUMER" | "MERCHANT" | "DRIVER" | null) => void;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: localStorage.getUser(),
  selectedRole: localStorage.getRole(),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data?.user) {
        const user = response.data.user;
        localStorage.setUser(user);
        localStorage.setRole(user.role);
        set({ 
          user, 
          selectedRole: user.role, 
          isLoading: false, 
          error: null 
        });
        return { success: true, user };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'Login failed' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.register(userData);
      
      if (response.success) {
        set({ isLoading: false, error: null });
        return { success: true, data: response.data };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'Registration failed' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  verifyOTP: async (email: string, otp: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.verifyOTP({ email, otp });
      
      if (response.success && response.data?.user) {
        const user = response.data.user;
        localStorage.setUser(user);
        localStorage.setRole(user.role);
        set({ 
          user, 
          selectedRole: user.role, 
          isLoading: false, 
          error: null 
        });
        return { success: true, user };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'OTP verification failed' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'OTP verification failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  resendOTP: async (email: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.resendOTP(email);
      
      if (response.success) {
        set({ isLoading: false, error: null });
        return { success: true };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'Failed to resend OTP' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend OTP';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clearAuth();
      set({ 
        user: null, 
        selectedRole: null, 
        isLoading: false, 
        error: null 
      });
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.updateProfile(updates);
      
      if (response.success && response.data) {
        const updatedUser = { ...currentUser, ...response.data };
        localStorage.setUser(updatedUser);
        set({ 
          user: updatedUser, 
          isLoading: false, 
          error: null 
        });
        return { success: true, user: updatedUser };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'Profile update failed' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Profile update failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  refreshUser: async () => {
    const currentUser = get().user;
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    set({ isLoading: true });
    
    try {
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data) {
        const user = response.data;
        localStorage.setUser(user);
        set({ 
          user, 
          isLoading: false, 
          error: null 
        });
        return { success: true, user };
      } else {
        set({ 
          isLoading: false, 
          error: response.error || 'Failed to refresh user data' 
        });
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh user data';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  setSelectedRole: (role) => {
    if (role) {
      localStorage.setRole(role);
    }
    set({ selectedRole: role });
  },

  clearError: () => {
    set({ error: null });
  },

  isAuthenticated: () => {
    return get().user !== null;
  },
}));
