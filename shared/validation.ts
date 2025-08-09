/**
 * Cross-platform validation utilities
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' }
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }
  
  return { isValid: true }
}

export const validatePhoneNumber = (phone: string, countryCode = '+234'): ValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Nigerian phone number validation
  if (countryCode === '+234') {
    // Should be 11 digits starting with 0, or 10 digits without 0
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      return { isValid: true }
    }
    
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      return { isValid: true }
    }
    
    return { isValid: false, error: 'Please enter a valid Nigerian phone number' }
  }
  
  // Basic international phone validation
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return { isValid: false, error: 'Please enter a valid phone number' }
  }
  
  return { isValid: true }
}

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` }
  }
  
  return { isValid: true }
}

export const validateMinLength = (value: string, minLength: number, fieldName: string): ValidationResult => {
  if (value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters long` }
  }
  
  return { isValid: true }
}

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): ValidationResult => {
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be no more than ${maxLength} characters long` }
  }
  
  return { isValid: true }
}