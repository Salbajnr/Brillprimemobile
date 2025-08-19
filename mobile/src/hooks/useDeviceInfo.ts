
import { useState, useEffect } from 'react';
import { Platform, Dimensions, DevSettings } from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface DevicePerformance {
  memoryUsage: number;
  batteryLevel: number;
  isLowPowerMode: boolean;
  networkType: string;
  deviceType: 'phone' | 'tablet';
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [performance, setPerformance] = useState<DevicePerformance | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const info = {
          deviceId: await DeviceInfo.getDeviceId(),
          systemName: DeviceInfo.getSystemName(),
          systemVersion: DeviceInfo.getSystemVersion(),
          model: await DeviceInfo.getDeviceModel(),
          brand: DeviceInfo.getBrand(),
          isTablet: DeviceInfo.isTablet(),
          hasNotch: DeviceInfo.hasNotch(),
          bundleId: DeviceInfo.getBundleId(),
          buildNumber: DeviceInfo.getBuildNumber(),
          version: DeviceInfo.getVersion(),
        };
        setDeviceInfo(info);

        // Performance monitoring
        const perfInfo: DevicePerformance = {
          memoryUsage: await DeviceInfo.getUsedMemory(),
          batteryLevel: await DeviceInfo.getBatteryLevel(),
          isLowPowerMode: await DeviceInfo.isPowerSaveMode(),
          networkType: await DeviceInfo.getNetworkType(),
          deviceType: DeviceInfo.isTablet() ? 'tablet' : 'phone',
        };
        setPerformance(perfInfo);
      } catch (error) {
        console.error('Error loading device info:', error);
      }
    };

    loadDeviceInfo();

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const getOptimalImageSize = () => {
    const { width, height } = dimensions;
    const pixelRatio = Platform.select({
      ios: 2,
      android: 2,
    });
    
    return {
      width: Math.round(width * (pixelRatio || 1)),
      height: Math.round(height * (pixelRatio || 1)),
    };
  };

  const shouldReduceAnimations = () => {
    return performance?.isLowPowerMode || performance?.memoryUsage > 0.8;
  };

  const getOptimalCacheSize = () => {
    const totalMemory = performance?.memoryUsage || 0;
    if (totalMemory < 0.3) return 50; // Low memory device
    if (totalMemory < 0.6) return 100; // Medium memory device
    return 200; // High memory device
  };

  return {
    deviceInfo,
    performance,
    dimensions,
    isTablet: deviceInfo?.isTablet || false,
    platform: Platform.OS,
    getOptimalImageSize,
    shouldReduceAnimations,
    getOptimalCacheSize,
  };
};

interface DeviceInfoType {
  platform: 'ios' | 'android';
  version: string;
  buildNumber: string;
  deviceId: string;
  model: string;
  screenWidth: number;
  screenHeight: number;
  isTablet: boolean;
  hasNotch: boolean;
  systemVersion: string;
  bundleId: string;
  appVersion: string;
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        const { width, height } = Dimensions.get('window');
        
        const info: DeviceInfoType = {
          platform: Platform.OS as 'ios' | 'android',
          version: Platform.Version.toString(),
          buildNumber: await DeviceInfo.getBuildNumber(),
          deviceId: await DeviceInfo.getUniqueId(),
          model: await DeviceInfo.getModel(),
          screenWidth: width,
          screenHeight: height,
          isTablet: await DeviceInfo.isTablet(),
          hasNotch: await DeviceInfo.hasNotch(),
          systemVersion: await DeviceInfo.getSystemVersion(),
          bundleId: await DeviceInfo.getBundleId(),
          appVersion: await DeviceInfo.getVersion(),
        };
        
        setDeviceInfo(info);
      } catch (error) {
        console.error('Error getting device info:', error);
      } finally {
        setLoading(false);
      }
    };

    getDeviceInfo();
  }, []);

  return { deviceInfo, loading };
};
