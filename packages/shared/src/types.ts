// Basic types for the web application
export interface User {
  id: string;
  email: string;
  name: string;
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
  phoneNumber?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Re-export commonly used types
export type UserRole = "CONSUMER" | "MERCHANT" | "DRIVER";