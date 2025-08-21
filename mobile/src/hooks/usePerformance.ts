
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

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

export const usePerformance = () => {
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics | null>(null);

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

  const preloadCriticalData = async () => {
    if (!metrics || shouldReduceQuality()) return;

    // Only preload on good connections and sufficient resources
    if (!metrics.isSlowConnection && metrics.memoryUsage < 0.6) {
      // Preload user's most accessed data
      console.log('Preloading critical data...');
      // Implementation would depend on your specific app needs
    }
  };

  return {
    metrics,
    shouldReduceQuality,
    getOptimalImageQuality,
    getOptimalCacheSize,
    optimizeForDevice,
    preloadCriticalData
  };
};
