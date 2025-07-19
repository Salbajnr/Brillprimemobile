import { apiRequest } from "./queryClient";
import type { 
  User, 
  AuthResponse, 
  SignupRequest, 
  SigninRequest, 
  VerifyOtpRequest, 
  ResetPasswordRequest, 
  ConfirmResetPasswordRequest,
  ResendOtpRequest 
} from "@/types/api";

export const authAPI = {
  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/signup", userData);
    return response.json();
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/verify-otp", data);
    return response.json();
  },

  signin: async (data: SigninRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/signin", data);
    return response.json();
  },

  resendOtp: async (data: ResendOtpRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/resend-email-otp", data);
    return response.json();
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/reset-password", data);
    return response.json();
  },

  confirmResetPassword: async (data: ConfirmResetPasswordRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/auth/confirm-reset-password", data);
    return response.json();
  },
};
