
import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  connectionType: string
  isSlowConnection: boolean
}

export const usePerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  useEffect(() => {
    const measurePerformance = () => {
      if (typeof window === 'undefined') return

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const memory = (performance as any).memory

      const performanceData: PerformanceMetrics = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        renderTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        memoryUsage: memory ? memory.usedJSHeapSize / memory.totalJSHeapSize : 0,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        isSlowConnection: (navigator as any).connection?.effectiveType === '2g' || 
                         (navigator as any).connection?.effectiveType === 'slow-2g'
      }

      setMetrics(performanceData)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
    }

    return () => window.removeEventListener('load', measurePerformance)
  }, [])

  const shouldReduceQuality = () => {
    if (!metrics) return false
    return metrics.isSlowConnection || metrics.memoryUsage > 0.8
  }

  const getOptimalImageQuality = () => {
    if (!metrics) return 80
    if (metrics.isSlowConnection) return 60
    if (metrics.memoryUsage > 0.8) return 70
    return 90
  }

  const preloadCriticalResources = () => {
    if (!metrics) return

    // Preload based on user role
    const userRole = localStorage.getItem('userRole')
    const preloadMap = {
      consumer: ['/src/pages/dashboard.tsx', '/src/pages/commodities.tsx'],
      merchant: ['/src/pages/merchant-dashboard.tsx', '/src/pages/order-management.tsx'],
      driver: ['/src/pages/driver-dashboard.tsx', '/src/pages/real-time-tracking.tsx'],
      admin: ['/src/pages/admin-dashboard.tsx', '/src/pages/admin-user-management.tsx']
    }

    const routesToPreload = preloadMap[userRole as keyof typeof preloadMap] || preloadMap.consumer
    
    routesToPreload.forEach(route => {
      const link = document.createElement('link')
      link.rel = 'modulepreload'
      link.href = route
      document.head.appendChild(link)
    })
  }

  const optimizeForDevice = () => {
    if (!metrics) return {}

    return {
      enableServiceWorker: !metrics.isSlowConnection,
      enablePushNotifications: metrics.memoryUsage < 0.7,
      prefetchNextPage: !metrics.isSlowConnection && metrics.memoryUsage < 0.6,
      useImagePlaceholders: metrics.isSlowConnection,
      enableAnimations: metrics.memoryUsage < 0.8
    }
  }

  return {
    metrics,
    shouldReduceQuality,
    getOptimalImageQuality,
    preloadCriticalResources,
    optimizeForDevice
  }
}
