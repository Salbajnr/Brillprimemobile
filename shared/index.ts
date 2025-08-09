// Platform utilities for cross-platform compatibility
export { Platform } from './platform'
export { Storage } from './storage'
export { Navigation } from './navigation'

// Common utilities
export { validateEmail, validatePassword } from './validation'
export { formatCurrency, formatDate } from './formatters'
export { generateId, debounce, throttle } from './utils'

// Types
export type { 
  User, 
  ApiResponse, 
  NavigationParams,
  StorageKey,
  ValidationResult 
} from './types'

// Re-export constants and API client for convenience
export * from '../constants/src'
export { default as ApiClient } from '../api-client/src'