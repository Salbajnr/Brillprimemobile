import type { User } from "@shared/schema";

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

  setRole: (role: "DRIVER" | "VENDOR") => {
    window.localStorage.setItem(STORAGE_KEYS.ROLE, role);
  },

  getRole: (): "DRIVER" | "VENDOR" | null => {
    return window.localStorage.getItem(STORAGE_KEYS.ROLE) as "DRIVER" | "VENDOR" | null;
  },

  clearAuth: () => {
    window.localStorage.removeItem(STORAGE_KEYS.USER);
    window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.localStorage.removeItem(STORAGE_KEYS.ROLE);
  },
};
