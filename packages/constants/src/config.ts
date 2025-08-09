export const APP_CONFIG = {
  name: 'CrossPlatform Monorepo',
  version: '1.0.0',
  description: 'A monorepo setup for cross-platform development',
  
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 10000
  },
  
  build: {
    target: ['web', 'mobile'],
    outputDir: 'dist'
  },
  
  features: {
    darkMode: true,
    notifications: true,
    analytics: false
  }
} as const

export const PACKAGE_TYPES = {
  APP: 'app',
  PACKAGE: 'package'
} as const

export const BUILD_STATUSES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BUILDING: 'building'
} as const

export type BuildStatus = typeof BUILD_STATUSES[keyof typeof BUILD_STATUSES]
export type PackageType = typeof PACKAGE_TYPES[keyof typeof PACKAGE_TYPES]
