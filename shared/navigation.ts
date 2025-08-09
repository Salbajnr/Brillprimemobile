import { Platform } from './platform'

/**
 * Cross-platform navigation abstraction
 */
export class Navigation {
  /**
   * Navigate to a route/URL
   */
  static navigate(route: string, params?: Record<string, any>): void {
    if (Platform.isWeb) {
      // Web navigation using History API or router
      if (params) {
        const searchParams = new URLSearchParams(params).toString()
        const url = `${route}?${searchParams}`
        window.history.pushState({}, '', url)
        
        // Dispatch custom event for router libraries
        window.dispatchEvent(new PopStateEvent('popstate'))
      } else {
        window.history.pushState({}, '', route)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } else {
      // React Native navigation would be handled by navigation prop
      console.warn('Navigation.navigate() called on native platform. Use React Navigation directly.')
    }
  }
  
  /**
   * Go back in navigation history
   */
  static goBack(): void {
    if (Platform.isWeb) {
      window.history.back()
    } else {
      console.warn('Navigation.goBack() called on native platform. Use React Navigation directly.')
    }
  }
  
  /**
   * Replace current route
   */
  static replace(route: string, params?: Record<string, any>): void {
    if (Platform.isWeb) {
      if (params) {
        const searchParams = new URLSearchParams(params).toString()
        const url = `${route}?${searchParams}`
        window.history.replaceState({}, '', url)
      } else {
        window.history.replaceState({}, '', route)
      }
    } else {
      console.warn('Navigation.replace() called on native platform. Use React Navigation directly.')
    }
  }
  
  /**
   * Get current route/URL
   */
  static getCurrentRoute(): string {
    if (Platform.isWeb) {
      return window.location.pathname
    } else {
      // This would need to be handled by the navigation context in React Native
      return ''
    }
  }
  
  /**
   * Get current route parameters
   */
  static getParams(): Record<string, string> {
    if (Platform.isWeb) {
      return Object.fromEntries(new URLSearchParams(window.location.search))
    } else {
      return {}
    }
  }
}