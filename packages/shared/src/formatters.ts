/**
 * Cross-platform formatting utilities
 */

export const formatCurrency = (
  amount: number, 
  currency = 'NGN', 
  locale = 'en-NG'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback for environments without Intl support
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency
    return `${symbol}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`
  }
}

export const formatDate = (
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string => {
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  if (format === 'relative') {
    return getRelativeTime(dateObj)
  }
  
  try {
    const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { 
        year: '2-digit', 
        month: 'short', 
        day: 'numeric' 
      },
      medium: { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      },
      long: { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      }
    }
    
    const options = optionsMap[format]
    
    return new Intl.DateTimeFormat('en-NG', options).format(dateObj)
  } catch (error) {
    // Fallback for environments without Intl support
    return dateObj.toLocaleDateString()
  }
}

export const formatTime = (date: Date | string | number): string => {
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Time'
  }
  
  try {
    return new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dateObj)
  } catch (error) {
    // Fallback for environments without Intl support
    return dateObj.toLocaleTimeString()
  }
}

export const formatDateTime = (date: Date | string | number): string => {
  return `${formatDate(date)} ${formatTime(date)}`
}

export const formatPhoneNumber = (phone: string, countryCode = '+234'): string => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (countryCode === '+234') {
    // Nigerian phone number formatting
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      // Format: 0803 123 4567
      return cleanPhone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
    }
    
    if (cleanPhone.length === 10) {
      // Format: +234 803 123 4567
      return `+234 ${cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}`
    }
  }
  
  // Basic international formatting
  if (cleanPhone.length >= 10) {
    return cleanPhone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3')
  }
  
  return phone
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
  }
  
  return formatDate(date, 'medium')
}