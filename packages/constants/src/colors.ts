export const COLORS = {
  primary: '#1976D2',
  secondary: '#424242',
  accent: '#00C853',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF5722',
  
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  
  blue: {
    50: '#EBF8FF',
    100: '#BEE3F8',
    500: '#3182CE',
    600: '#1976D2',
    700: '#1565C0'
  },
  
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    800: '#166534'
  }
} as const

export type ColorPalette = typeof COLORS
