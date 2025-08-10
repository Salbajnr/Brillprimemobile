
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './APIService';

class LocationServiceClass {
  private watchId: number | null = null;
  private isTracking: boolean = false;

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'BrillPrime needs access to your location for delivery services',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS permissions handled in Info.plist
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Location permission is required for this feature');
      return null;
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  async startLocationTracking(userId: string, userRole: string) {
    if (this.isTracking) return;

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) return;

    this.isTracking = true;
    this.watchId = Geolocation.watchPosition(
      async (position) => {
        const locationData = {
          userId,
          userRole,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
        };

        // Store location locally
        await AsyncStorage.setItem('lastLocation', JSON.stringify(locationData));

        // Send to backend for drivers
        if (userRole === 'driver') {
          try {
            await APIService.updateDriverLocation(locationData);
          } catch (error) {
            console.error('Failed to update driver location:', error);
          }
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 30000, // Update every 30 seconds
        fastestInterval: 10000, // Fastest update every 10 seconds
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  async getLastKnownLocation() {
    try {
      const lastLocation = await AsyncStorage.getItem('lastLocation');
      return lastLocation ? JSON.parse(lastLocation) : null;
    } catch (error) {
      console.error('Error getting last location:', error);
      return null;
    }
  }
}

export const LocationService = new LocationServiceClass();
export const initializeLocationService = () => {
  // Initialize location service if needed
  console.log('Location service initialized');
};
