import { create } from "zustand";
import type { User } from "@shared/schema";
import { localStorage } from "@/lib/storage";

interface AuthState {
  user: User | null;
  selectedRole: "CONSUMER" | "MERCHANT" | "DRIVER" | null;
  setUser: (user: User | null) => void;
  setSelectedRole: (role: "CONSUMER" | "MERCHANT" | "DRIVER" | null) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: localStorage.getUser(),
  selectedRole: localStorage.getRole(),
  
  setUser: (user) => {
    if (user) {
      localStorage.setUser(user);
    }
    set({ user });
  },
  
  setSelectedRole: (role) => {
    if (role) {
      localStorage.setRole(role);
    }
    set({ selectedRole: role });
  },
  
  signOut: () => {
    localStorage.clearAuth();
    set({ user: null, selectedRole: null });
  },
  
  isAuthenticated: () => {
    return get().user !== null;
  },
}));
