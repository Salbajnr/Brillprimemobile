
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NotificationServiceClass {
  async initializeNotifications() {
    // Request permission for iOS
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Push notification permission denied');
        return;
      }
    }

    // Configure local notifications
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('Notification received:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Get FCM token
    const fcmToken = await messaging().getToken();
    await AsyncStorage.setItem('fcmToken', fcmToken);
    console.log('FCM Token:', fcmToken);

    // Listen for token refresh
    messaging().onTokenRefresh(async (token) => {
      await AsyncStorage.setItem('fcmToken', token);
      // Send token to your backend
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      this.showLocalNotification(remoteMessage);
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });
  }

  showLocalNotification(message: any) {
    PushNotification.localNotification({
      title: message.notification?.title || 'BrillPrime',
      message: message.notification?.body || 'New notification',
      playSound: true,
      soundName: 'default',
      actions: ['OK'],
    });
  }

  async scheduleNotification(title: string, message: string, date: Date) {
    PushNotification.localNotificationSchedule({
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
    });
  }
}

export const NotificationService = new NotificationServiceClass();
export const initializeNotifications = () => NotificationService.initializeNotifications();
