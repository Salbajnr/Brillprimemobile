
import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

class PermissionManager {
  private getPermission(type: string): Permission | null {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'camera':
          return PERMISSIONS.IOS.CAMERA;
        case 'location':
          return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
        case 'notifications':
          return PERMISSIONS.IOS.NOTIFICATIONS;
        case 'microphone':
          return PERMISSIONS.IOS.MICROPHONE;
        default:
          return null;
      }
    } else {
      switch (type) {
        case 'camera':
          return PERMISSIONS.ANDROID.CAMERA;
        case 'location':
          return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
        case 'notifications':
          return PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
        case 'microphone':
          return PERMISSIONS.ANDROID.RECORD_AUDIO;
        case 'storage':
          return PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        default:
          return null;
      }
    }
  }

  async checkPermission(type: string): Promise<boolean> {
    try {
      const permission = this.getPermission(type);
      if (!permission) return true; // Permission not required on this platform

      const result = await check(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error(`Error checking ${type} permission:`, error);
      return false;
    }
  }

  async requestPermission(type: string): Promise<boolean> {
    try {
      const permission = this.getPermission(type);
      if (!permission) return true;

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      return false;
    }
  }

  async requestPermissionWithRationale(type: string, rationale: string): Promise<boolean> {
    const hasPermission = await this.checkPermission(type);
    if (hasPermission) return true;

    return new Promise((resolve) => {
      Alert.alert(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Permission Required`,
        rationale,
        [
          {
            text: 'Cancel',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const granted = await this.requestPermission(type);
              if (!granted) {
                Alert.alert(
                  'Permission Denied',
                  'Please enable this permission in Settings to continue.',
                  [
                    { text: 'Cancel', onPress: () => resolve(false) },
                    { 
                      text: 'Open Settings', 
                      onPress: () => {
                        Linking.openSettings();
                        resolve(false);
                      }
                    },
                  ]
                );
              } else {
                resolve(true);
              }
            },
          },
        ]
      );
    });
  }

  async requestMultiplePermissions(permissions: string[]): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const permission of permissions) {
      results[permission] = await this.requestPermission(permission);
    }
    
    return results;
  }
}

export const permissionManager = new PermissionManager();
export default permissionManager;
