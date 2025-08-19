
import { lazy } from 'react'

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('../pages/dashboard'))
export const LazyMerchantDashboard = lazy(() => import('../pages/merchant-dashboard'))
export const LazyDriverDashboard = lazy(() => import('../pages/driver-dashboard'))
export const LazyAdminDashboard = lazy(() => import('../pages/admin-dashboard'))
export const LazyChat = lazy(() => import('../pages/chat'))
export const LazyMap = lazy(() => import('../pages/map-home'))
export const LazyAnalytics = lazy(() => import('../pages/merchant-analytics'))

// Preload critical components
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload dashboard based on user role
    const userRole = localStorage.getItem('userRole')
    
    switch (userRole) {
      case 'merchant':
        import('../pages/merchant-dashboard')
        break
      case 'driver':
        import('../pages/driver-dashboard')
        break
      case 'admin':
        import('../pages/admin-dashboard')
        break
      default:
        import('../pages/dashboard')
    }
    
    // Preload commonly used components
    setTimeout(() => {
      import('../pages/chat')
      import('../pages/notifications')
    }, 2000)
  }
}
