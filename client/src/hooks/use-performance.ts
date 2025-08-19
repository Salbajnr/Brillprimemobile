
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

  return {
    metrics,
    shouldReduceQuality,
    getOptimalImageQuality
  }
}
