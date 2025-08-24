
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePerformance } from '../hooks/usePerformance';

class MobileBundleOptimizer {
  private componentCache = new Map();
  private preloadedModules = new Set();

  async optimizeBundle() {
    const { metrics, optimizeForDevice } = usePerformance();
    const deviceOptimizations = optimizeForDevice();

    // Only enable aggressive optimizations on capable devices
    if (deviceOptimizations.enableAnimations) {
      await this.preloadAnimationModules();
    }

    if (deviceOptimizations.prefetchImages) {
      await this.preloadImageComponents();
    }

    // Cache component modules based on device capability
    await this.setupComponentCaching(deviceOptimizations);
  }

  private async preloadAnimationModules() {
    try {
      // Preload animation libraries only when needed
      if (!this.preloadedModules.has('animations')) {
        await import('react-native-reanimated');
        this.preloadedModules.add('animations');
      }
    } catch (error) {
      console.warn('Animation modules not available:', error);
    }
  }

  private async preloadImageComponents() {
    try {
      if (!this.preloadedModules.has('images')) {
        await import('react-native-fast-image');
        this.preloadedModules.add('images');
      }
    } catch (error) {
      console.warn('Fast image not available, using default Image component');
    }
  }

  private async setupComponentCaching(optimizations: any) {
    // Cache frequently used components based on device performance
    const cacheSize = optimizations.enableOfflineSync ? 50 : 20;
    
    if (this.componentCache.size > cacheSize) {
      // Clear oldest entries
      const entries = Array.from(this.componentCache.entries());
      const toRemove = entries.slice(0, entries.length - cacheSize);
      toRemove.forEach(([key]) => this.componentCache.delete(key));
    }
  }

  lazyLoadComponent(componentName: string, loader: () => Promise<any>) {
    if (this.componentCache.has(componentName)) {
      return Promise.resolve(this.componentCache.get(componentName));
    }

    return loader().then(component => {
      this.componentCache.set(componentName, component);
      return component;
    });
  }

  async getOptimalChunkSize() {
    const { metrics } = usePerformance();
    
    if (!metrics) return 'medium';
    
    // Determine chunk size based on device capabilities
    if (metrics.memoryUsage > 0.8 || metrics.isSlowConnection) {
      return 'small'; // Smaller chunks for limited devices
    } else if (metrics.deviceType === 'tablet' && !metrics.isLowPowerMode) {
      return 'large'; // Larger chunks for capable tablets
    }
    
    return 'medium';
  }
}

export const mobileBundleOptimizer = new MobileBundleOptimizer();

import React from 'react';

// Mobile-specific lazy loading helpers
export const createLazyMobileComponent = (loader: () => Promise<any>) => {
  return React.lazy(() => {
    return mobileBundleOptimizer.lazyLoadComponent(
      loader.toString(),
      loader
    );
  });
};

// Platform-specific optimizations
export const platformOptimize = {
  image: (props: any) => {
    if (Platform.OS === 'android') {
      return {
        ...props,
        resizeMethod: 'resize', // Better for Android
        cache: 'force-cache'
      };
    } else {
      return {
        ...props,
        resizeMode: 'cover' // Better for iOS
      };
    }
  },
  
  animation: (config: any, shouldReduce: boolean = false) => {
    if (shouldReduce) {
      return {
        ...config,
        duration: config.duration * 0.5, // Reduce animation duration
        useNativeDriver: true // Use native driver for better performance
      };
    }
    
    return config;
  }
};
export class MobileBundleOptimizer {
  private static instance: MobileBundleOptimizer;
  private preloadedComponents = new Set<string>();
  private componentCache = new Map<string, any>();

  static getInstance(): MobileBundleOptimizer {
    if (!this.instance) {
      this.instance = new MobileBundleOptimizer();
    }
    return this.instance;
  }

  async optimizeBundle(): Promise<void> {
    try {
      // Preload critical screens
      await this.preloadCriticalScreens();
      
      // Initialize lazy loading for non-critical components
      this.setupLazyLoading();
      
      console.log('✅ Mobile bundle optimization completed');
    } catch (error) {
      console.error('❌ Bundle optimization failed:', error);
    }
  }

  private async preloadCriticalScreens(): Promise<void> {
    const criticalScreens = [
      'SplashScreen',
      'SignInScreen',
      'HomeScreen',
      'DashboardScreen'
    ];

    for (const screen of criticalScreens) {
      if (!this.preloadedComponents.has(screen)) {
        try {
          const component = await import(`../screens/${screen}`);
          this.componentCache.set(screen, component);
          this.preloadedComponents.add(screen);
        } catch (error) {
          console.warn(`Failed to preload ${screen}:`, error);
        }
      }
    }
  }

  private setupLazyLoading(): void {
    // Configure lazy loading for heavy components
    const lazyComponents = [
      'QRScannerScreen',
      'OrderHistoryScreen',
      'AnalyticsScreen'
    ];

    lazyComponents.forEach(component => {
      if (!this.componentCache.has(component)) {
        // Set up lazy loading placeholder
        this.componentCache.set(component, () => import(`../screens/${component}`));
      }
    });
  }

  getComponent(name: string): any {
    return this.componentCache.get(name);
  }

  isPreloaded(name: string): boolean {
    return this.preloadedComponents.has(name);
  }
}

export const mobileBundleOptimizer = MobileBundleOptimizer.getInstance();
