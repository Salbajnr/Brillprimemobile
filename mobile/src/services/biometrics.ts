
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Alert } from 'react-native';
import { storageService } from '../utils/storage';

class BiometricService {
  private rnBiometrics = new ReactNativeBiometrics();

  async isBiometricSupported(): Promise<{ available: boolean; biometryType?: BiometryTypes }> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return { available, biometryType };
    } catch (error) {
      console.error('Biometric availability check error:', error);
      return { available: false };
    }
  }

  async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const { available } = await this.isBiometricSupported();
      
      if (!available) {
        Alert.alert('Biometric Not Available', 'Biometric authentication is not supported on this device');
        return false;
      }

      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Cancel',
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async enableBiometricLogin(userId: string): Promise<boolean> {
    try {
      const { available } = await this.isBiometricSupported();
      
      if (!available) {
        Alert.alert('Biometric Not Available', 'Biometric authentication is not supported on this device');
        return false;
      }

      // Create key for biometric authentication
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        const { success } = await this.rnBiometrics.createKeys();
        if (!success) {
          return false;
        }
      }

      // Store biometric preference
      await storageService.setItem(`biometric_enabled_${userId}`, true);
      
      return true;
    } catch (error) {
      console.error('Enable biometric login error:', error);
      return false;
    }
  }

  async disableBiometricLogin(userId: string): Promise<void> {
    try {
      await storageService.removeItem(`biometric_enabled_${userId}`);
      await this.rnBiometrics.deleteKeys();
    } catch (error) {
      console.error('Disable biometric login error:', error);
    }
  }

  async isBiometricEnabledForUser(userId: string): Promise<boolean> {
    try {
      const enabled = await storageService.getItem(`biometric_enabled_${userId}`);
      return !!enabled;
    } catch (error) {
      console.error('Check biometric enabled error:', error);
      return false;
    }
  }

  async createSignature(payload: string): Promise<{ success: boolean; signature?: string }> {
    try {
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Authenticate to sign transaction',
        payload,
      });

      return { success, signature };
    } catch (error) {
      console.error('Create signature error:', error);
      return { success: false };
    }
  }
}

export const biometricService = new BiometricService();
export default biometricService;
