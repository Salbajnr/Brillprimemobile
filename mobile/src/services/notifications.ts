
import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { storageService } from '../utils/storage';
import { apiService } from './api';

class NotificationService {
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        return enabled;
      } else {
        // Android permissions are handled automatically
        return true;
      }
    } catch (error) {
      console.error('Notification permission request error:', error);
      return false;
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Get FCM token error:', error);
      return null;
    }
  }

  async registerDevice(userId: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermission();
      
      if (!hasPermission) {
        console.log('Notification permission not granted');
        return;
      }

      const token = await this.getFCMToken();
      
      if (!token) {
        console.log('FCM token not available');
        return;
      }

      // Send token to backend
      await apiService.post('/notifications/register-device', {
        userId,
        deviceToken: token,
        platform: Platform.OS,
      });

      // Store token locally
      await storageService.setItem('fcm_token', token);
    } catch (error) {
      console.error('Register device error:', error);
    }
  }

  async setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Message received in foreground!', remoteMessage);
      
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || 'You have a new message',
          [{ text: 'OK' }]
        );
      }
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background:', remoteMessage);
      // Navigate to specific screen based on notification data
    });

    // Handle app opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          // Navigate to specific screen based on notification data
        }
      });

    return unsubscribe;
  }

  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Subscribe to topic error: ${topic}`, error);
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Unsubscribe from topic error: ${topic}`, error);
    }
  }

  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      // This would require a local notification library like @react-native-community/push-notification-ios
      // or react-native-push-notification for cross-platform local notifications
      console.log('Local notification:', { title, body, data });
    } catch (error) {
      console.error('Send local notification error:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
