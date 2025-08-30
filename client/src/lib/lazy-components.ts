
import { lazy } from 'react'

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('../pages/dashboard'))
export const LazyMerchantDashboard = lazy(() => import('../pages/merchant-dashboard'))
export const LazyDriverDashboard = lazy(() => import('../pages/driver-dashboard'))
export const LazyAdminDashboard = lazy(() => import('../pages/admin-dashboard'))
export const LazyChat = lazy(() => import('../pages/chat'))
export const LazyMap = lazy(() => import('../pages/map-home'))
export const LazyAnalytics = lazy(() => import('../pages/merchant-analytics'))

// Preload critical components with intelligent prefetching
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload dashboard based on user role
    const userRole = localStorage.getItem('userRole')
    
    // Role-specific critical paths
    const roleComponentMap = {
      merchant: [
        () => import('../pages/merchant-dashboard'),
        () => import('../pages/order-management'),
        () => import('../pages/merchant-analytics')
      ],
      driver: [
        () => import('../pages/driver-dashboard'),
        () => import('../pages/real-time-tracking'),
        () => import('../pages/driver-withdrawal')
      ],
      admin: [
        () => import('../pages/admin-dashboard'),
        () => import('../pages/admin-user-management'),
        () => import('../pages/admin-monitoring')
      ],
      consumer: [
        () => import('../pages/dashboard'),
        () => import('../pages/commodities'),
        () => import('../pages/cart')
      ]
    }
    
    const componentsToPreload = roleComponentMap[userRole as keyof typeof roleComponentMap] || roleComponentMap.consumer
    
    // Preload immediately
    componentsToPreload[0]?.()
    
    // Preload secondary components after initial load
    requestIdleCallback(() => {
      componentsToPreload.slice(1).forEach((importFn, index) => {
        setTimeout(importFn, index * 500)
      })
    })
    
    // Preload common components
    requestIdleCallback(() => {
      setTimeout(() => {
        import('../pages/chat')
        import('../pages/notifications')
        import('../pages/profile')
      }, 2000)
      
      // Preload based on user activity patterns
      setTimeout(() => {
        const lastVisited = JSON.parse(localStorage.getItem('lastVisitedPages') || '[]')
        lastVisited.slice(0, 3).forEach((page: string) => {
          import(`../pages/${page}.tsx`)
        })
      }, 3000)
    })
  }
}

// Track page visits for intelligent prefetching
export const trackPageVisit = (pageName: string) => {
  const lastVisited = JSON.parse(localStorage.getItem('lastVisitedPages') || '[]')
  const updatedVisited = [pageName, ...lastVisited.filter((p: string) => p !== pageName)].slice(0, 10)
  localStorage.setItem('lastVisitedPages', JSON.stringify(updatedVisited))
}

// Prefetch likely next pages based on current route
export const prefetchLikelyPages = (currentRoute: string) => {
  const prefetchMap: Record<string, string[]> = {
    '/dashboard': ['commodities', 'cart', 'orders'],
    '/commodities': ['cart', 'checkout', 'product-detail'],
    '/cart': ['checkout', 'payment-methods', 'commodities'],
    '/merchant-dashboard': ['order-management', 'merchant-analytics', 'products'],
    '/driver-dashboard': ['real-time-tracking', 'driver-withdrawal', 'order-history'],
    '/admin-dashboard': ['admin-user-management', 'admin-monitoring', 'admin-support']
  }
  
  const pagesToPrefetch = prefetchMap[currentRoute] || []
  
  requestIdleCallback(() => {
    pagesToPrefetch.forEach((page, index) => {
      setTimeout(() => {
        import(`../pages/${page}.tsx`).catch(() => {
          // Silently fail for non-existent pages
        })
      }, index * 200)
    })
  })
}
