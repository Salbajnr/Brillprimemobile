import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

export interface AuthResponse {
  message: string;
  user?: User;
  userId?: number;
}

export const authAPI = {
  signup: async (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: "DRIVER" | "VENDOR";
  }): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/signup", userData);
    return response.json();
  },

  verifyOtp: async (data: { email: string; otp: string }): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/verify-otp", data);
    return response.json();
  },

  signin: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/signin", data);
    return response.json();
  },

  resendOtp: async (email: string): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/resend-otp", { email });
    return response.json();
  },
};
