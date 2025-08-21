
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
