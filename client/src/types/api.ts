// API Response Types for External Backend Integration

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
  isVerified: boolean;
  profilePicture?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  bio?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  status: "Success" | "Error";
  message: string;
  data?: {
    userId?: string;
    user?: User;
    token?: string;
  };
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResendOtpRequest {
  email: string;
}

// Social Login Types
export interface SocialAuthProfile {
  id: string;
  email?: string;
  name: string;
  picture?: string;
  provider: "google" | "apple" | "facebook";
}

// Error Response Type
export interface ErrorResponse {
  status: "Error";
  message: string;
  errors?: string[];
}