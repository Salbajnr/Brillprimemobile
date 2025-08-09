// Custom hook for managing native permissions
import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { request, check, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';
import { useAppDispatch } from '../store/hooks';
import { 
  updateLocationPermission, 
  updateCameraPermission, 
  updatePushNotificationPermission 
} from '../store/slices/appSlice';

type PermissionType = 'location' | 'camera' | 'microphone' | 'storage' | 'contacts';

interface UsePermissionsReturn {
  requestPermission: (type: PermissionType) => Promise<boolean>;
  checkPermission: (type: PermissionType) => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
  requestCameraPermission: () => Promise<boolean>;
  requestMicrophonePermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number }>;
  showPermissionAlert: (type: PermissionType) => void;
}

export const usePermissions = (): UsePermissionsReturn => {
  const dispatch = useAppDispatch();

  const getPermissionForPlatform = (type: PermissionType) => {
    const permissions = {
      location: Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      camera: Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA,
      microphone: Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.MICROPHONE 
        : PERMISSIONS.ANDROID.RECORD_AUDIO,
      storage: Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.PHOTO_LIBRARY 
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      contacts: Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CONTACTS 
        : PERMISSIONS.ANDROID.READ_CONTACTS,
    };
    return permissions[type];
  };

  const checkPermission = async (type: PermissionType): Promise<boolean> => {
    try {
      const permission = getPermissionForPlatform(type);
      const result = await check(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error(`Error checking ${type} permission:`, error);
      return false;
    }
  };

  const requestPermission = async (type: PermissionType): Promise<boolean> => {
    try {
      const permission = getPermissionForPlatform(type);
      const result = await request(permission);
      
      const granted = result === RESULTS.GRANTED;
      
      // Update Redux store
      switch (type) {
        case 'location':
          dispatch(updateLocationPermission({ granted }));
          break;
        case 'camera':
          dispatch(updateCameraPermission({ granted }));
          break;
      }
      
      if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
        showPermissionAlert(type);
      }
      
      return granted;
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Brillprime needs access to your location for delivery tracking and nearby services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        dispatch(updateLocationPermission({ granted: hasPermission }));
        return hasPermission;
      } else {
        return await requestPermission('location');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Brillprime needs access to your camera for QR scanning and photo uploads.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        dispatch(updateCameraPermission({ granted: hasPermission }));
        return hasPermission;
      } else {
        return await requestPermission('camera');
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    return await requestPermission('microphone');
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  };

  const showPermissionAlert = (type: PermissionType) => {
    const messages = {
      location: 'Location access is required for delivery tracking and finding nearby services. Please enable it in Settings.',
      camera: 'Camera access is required for QR scanning and photo uploads. Please enable it in Settings.',
      microphone: 'Microphone access is required for voice messages. Please enable it in Settings.',
      storage: 'Storage access is required for saving photos and documents. Please enable it in Settings.',
      contacts: 'Contacts access is required for emergency contact features. Please enable it in Settings.',
    };

    Alert.alert(
      'Permission Required',
      messages[type],
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              openSettings();
            }
          }
        },
      ]
    );
  };

  return {
    requestPermission,
    checkPermission,
    requestLocationPermission,
    requestCameraPermission,
    requestMicrophonePermission,
    getCurrentLocation,
    showPermissionAlert,
  };
};

export default usePermissions;