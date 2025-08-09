import type { User } from "@shared/types";

const STORAGE_KEYS = {
  USER: "brillprime_user",
  TOKEN: "brillprime_token",
  ROLE: "brillprime_role",
} as const;

export const localStorage = {
  setUser: (user: User) => {
    window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getUser: (): User | null => {
    try {
      const user = window.localStorage.getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setRole: (role: "CONSUMER" | "MERCHANT" | "DRIVER") => {
    window.localStorage.setItem(STORAGE_KEYS.ROLE, role);
  },

  getRole: (): "CONSUMER" | "MERCHANT" | "DRIVER" | null => {
    return window.localStorage.getItem(STORAGE_KEYS.ROLE) as "CONSUMER" | "MERCHANT" | "DRIVER" | null;
  },

  clearAuth: () => {
    window.localStorage.removeItem(STORAGE_KEYS.USER);
    window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.localStorage.removeItem(STORAGE_KEYS.ROLE);
  },
};
