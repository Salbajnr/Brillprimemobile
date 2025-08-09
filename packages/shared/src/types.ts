/**
 * Shared types for cross-platform compatibility
 */

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN'
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface ApiError {
  message: string
  code: string
  status: number
  details?: any
}

export interface NavigationParams {
  [key: string]: string | number | boolean | undefined
}

export type StorageKey = 
  | 'user'
  | 'token'
  | 'refreshToken'
  | 'preferences'
  | 'theme'
  | 'language'
  | 'onboardingComplete'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface Location {
  latitude: number
  longitude: number
  address?: string
}

export interface FileUpload {
  uri: string
  type: string
  name: string
  size?: number
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
  read: boolean
  data?: any
}

export interface Theme {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface AppConfig {
  apiBaseUrl: string
  websocketUrl?: string
  environment: 'development' | 'staging' | 'production'
  version: string
  features: {
    darkMode: boolean
    notifications: boolean
    analytics: boolean
    biometrics: boolean
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type NonNullable<T> = T extends null | undefined ? never : T