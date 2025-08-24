import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

interface MobilePerformanceMetrics {
  memoryUsage: number;
  batteryLevel: number;
  isLowPowerMode: boolean;
  connectionType: string;
  isSlowConnection: boolean;
  deviceType: 'phone' | 'tablet';
  freeStorage: number;
  appMemoryUsage: number;
}

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  networkSpeed: number;
  cacheHitRate: number;
}

export const usePerformance = () => {
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    networkSpeed: 0,
    cacheHitRate: 0,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  const preloadCriticalData = useCallback(async () => {
    try {
      setIsOptimizing(true);

      // Preload user session
      const userSession = await AsyncStorage.getItem('userSession');

      // Preload app configuration
      await AsyncStorage.getItem('appConfig');

      // Check network status
      const networkState = await NetInfo.fetch();

      console.log('✅ Critical data preloaded', {
        hasUserSession: !!userSession,
        networkConnected: networkState.isConnected
      });

    } catch (error) {
      console.error('❌ Failed to preload critical data:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const measureLoadTime = useCallback((startTime: number) => {
    const loadTime = Date.now() - startTime;
    setAppMetrics(prev => ({ ...prev, loadTime }));
    return loadTime;
  }, []);

  const optimizeMemoryUsage = useCallback(async () => {
    try {
      // Clear old cache entries
      const keys = await AsyncStorage.getAllKeys();
      const oldCacheKeys = keys.filter(key => 
        key.startsWith('cache_') && 
        Date.now() - parseInt(key.split('_')[1]) > 24 * 60 * 60 * 1000 // 24 hours
      );

      if (oldCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(oldCacheKeys);
        console.log(`🧹 Cleaned ${oldCacheKeys.length} old cache entries`);
      }
    } catch (error) {
      console.error('❌ Memory optimization failed:', error);
    }
  }, []);

  const trackNetworkPerformance = useCallback(async () => {
    try {
      const startTime = Date.now();
      // Using a placeholder URL as the actual API endpoint is not provided.
      // Replace 'http://0.0.0.0:5000/api/health' with your actual API health check endpoint.
      const response = await fetch('http://0.0.0.0:5000/api/health'); 
      const endTime = Date.now();

      const networkSpeed = endTime - startTime;
      setAppMetrics(prev => ({ ...prev, networkSpeed }));

      return response.ok;
    } catch (error) {
      console.error('❌ Network performance tracking failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const measurePerformance = async () => {
      try {
        const [
          memoryUsage,
          batteryLevel,
          isLowPowerMode,
          netInfo,
          freeStorage,
          usedMemory,
          totalMemory
        ] = await Promise.all([
          DeviceInfo.getUsedMemory(),
          DeviceInfo.getBatteryLevel(),
          DeviceInfo.isPowerSaveMode(),
          NetInfo.fetch(),
          DeviceInfo.getFreeDiskStorage(),
          DeviceInfo.getUsedMemory(),
          DeviceInfo.getTotalMemory()
        ]);

        const performanceData: MobilePerformanceMetrics = {
          memoryUsage: totalMemory > 0 ? usedMemory / totalMemory : 0,
          batteryLevel,
          isLowPowerMode,
          connectionType: netInfo.type || 'unknown',
          isSlowConnection: netInfo.type === 'cellular' && 
                           (netInfo.details as any)?.cellularGeneration === '2g',
          deviceType: DeviceInfo.isTablet() ? 'tablet' : 'phone',
          freeStorage,
          appMemoryUsage: usedMemory
        };

        setMetrics(performanceData);
      } catch (error) {
        console.error('Error measuring performance:', error);
      }
    };

    measurePerformance();

    // Update metrics every 30 seconds
    const interval = setInterval(measurePerformance, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initial performance setup
    optimizeMemoryUsage();
    trackNetworkPerformance();
  }, [optimizeMemoryUsage, trackNetworkPerformance]);

  const shouldReduceQuality = () => {
    if (!metrics) return false;
    return metrics.isSlowConnection || 
           metrics.memoryUsage > 0.8 || 
           metrics.isLowPowerMode ||
           metrics.batteryLevel < 0.2;
  };

  const getOptimalImageQuality = () => {
    if (!metrics) return 80;
    if (metrics.isSlowConnection) return 50;
    if (metrics.memoryUsage > 0.8) return 60;
    if (metrics.isLowPowerMode) return 65;
    if (metrics.batteryLevel < 0.2) return 55;
    return 85;
  };

  const getOptimalCacheSize = () => {
    if (!metrics) return 50;
    const totalMemoryGB = metrics.freeStorage / (1024 * 1024 * 1024);
    
    if (totalMemoryGB < 1) return 25; // Low storage device
    if (totalMemoryGB < 3) return 50; // Medium storage device
    if (metrics.memoryUsage > 0.7) return 35; // High memory usage
    return 100; // High storage device
  };

  const optimizeForDevice = () => {
    if (!metrics) return {};

    return {
      enableOfflineSync: metrics.freeStorage > 500 * 1024 * 1024, // 500MB
      enablePushNotifications: metrics.memoryUsage < 0.7,
      prefetchImages: !metrics.isSlowConnection && metrics.memoryUsage < 0.6,
      useImagePlaceholders: metrics.isSlowConnection || metrics.isLowPowerMode,
      enableAnimations: metrics.memoryUsage < 0.8 && !metrics.isLowPowerMode,
      enableBackgroundSync: metrics.batteryLevel > 0.3 && !metrics.isLowPowerMode,
      reducePolling: metrics.isSlowConnection || metrics.batteryLevel < 0.2
    };
  };

  return {
    metrics,
    appMetrics,
    isOptimizing,
    shouldReduceQuality,
    getOptimalImageQuality,
    getOptimalCacheSize,
    optimizeForDevice,
    preloadCriticalData,
    measureLoadTime,
    optimizeMemoryUsage,
    trackNetworkPerformance,
  };
};