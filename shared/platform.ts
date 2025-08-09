/**
 * Cross-platform utilities for detecting and handling platform differences
 */

export const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 'native' as 'web' | 'native' | 'ios' | 'android',
  
  get isWeb() {
    return typeof window !== 'undefined'
  },
  
  get isNative() {
    return typeof window === 'undefined'
  },
  
  get isMobile() {
    if (this.isWeb) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
    return this.isNative
  },
  
  get isDesktop() {
    return this.isWeb && !this.isMobile
  },
  
  select<T>(options: { web?: T; native?: T; ios?: T; android?: T; default?: T }): T | undefined {
    if (this.isWeb && options.web !== undefined) {
      return options.web
    }
    
    if (this.isNative && options.native !== undefined) {
      return options.native
    }
    
    // For React Native, check specific platforms
    if (this.OS === 'ios' && options.ios !== undefined) {
      return options.ios
    }
    
    if (this.OS === 'android' && options.android !== undefined) {
      return options.android
    }
    
    return options.default
  }
}

/**
 * Platform-specific styles utility
 */
export const createPlatformStyles = <T extends Record<string, any>>(styles: {
  web?: T
  native?: T
  ios?: T
  android?: T
  common?: T
}) => {
  const common = styles.common || {}
  const platformSpecific = Platform.select({
    web: styles.web,
    native: styles.native,
    ios: styles.ios,
    android: styles.android,
    default: {}
  }) as T || {} as T
  
  return { ...common, ...platformSpecific }
}