
import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';

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
