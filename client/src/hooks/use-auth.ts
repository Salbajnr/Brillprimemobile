import { create } from "zustand";
import type { User } from "@shared/schema";
import { localStorage } from "@/lib/storage";

interface AuthState {
  user: User | null;
  selectedRole: "CONSUMER" | "MERCHANT" | "DRIVER" | null;
  setUser: (user: User | null) => void;
  setSelectedRole: (role: "CONSUMER" | "MERCHANT" | "DRIVER" | null) => void;
  updateUser: (updates: Partial<User>) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>((set: (partial: Partial<AuthState>) => void, get: () => AuthState) => ({
  user: localStorage.getUser(),
  selectedRole: localStorage.getRole(),
  
  setUser: (user: User | null) => {
    console.log("useAuth.setUser called with:", user);
    if (user) {
      localStorage.setUser(user);
      // Also store the role for consistency
      localStorage.setRole(user.role);
    }
    set({ user, selectedRole: user?.role || null });
  },
  
  setSelectedRole: (role: "CONSUMER" | "MERCHANT" | "DRIVER" | null) => {
    if (role) {
      localStorage.setRole(role);
    }
    set({ selectedRole: role });
  },

  updateUser: (updates: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setUser(updatedUser);
      set({ user: updatedUser });
    }
  },
  
  signOut: () => {
    localStorage.clearAuth();
    set({ user: null, selectedRole: null });
  },
  
  isAuthenticated: () => {
    return get().user !== null;
  },
}));
