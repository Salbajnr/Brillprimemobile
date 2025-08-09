
// Push Notifications Service
interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  constructor() {
    this.init();
  }

  private async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.registration);
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'NOTIFICATION_CLICK':
        this.handleNotificationClick(payload);
        break;
      case 'NOTIFICATION_ACTION':
        this.handleNotificationAction(payload);
        break;
    }
  }

  private handleNotificationClick(payload: any) {
    // Handle notification click - navigate to relevant page
    if (payload.url) {
      window.location.href = payload.url;
    }
  }

  private handleNotificationAction(payload: any) {
    // Handle notification action buttons
    const { action, data } = payload;
    
    switch (action) {
      case 'view_order':
        window.location.href = `/order-details/${data.orderId}`;
        break;
      case 'accept_delivery':
        this.acceptDeliveryJob(data.jobId);
        break;
      case 'mark_read':
        this.markNotificationAsRead(data.notificationId);
        break;
    }
  }

  private async acceptDeliveryJob(jobId: string) {
    try {
      await fetch(`/api/driver/accept-job/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to accept delivery job:', error);
    }
  }

  private async markNotificationAsRead(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission;
  }

  async subscribe(userId: string): Promise<boolean> {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return false;
    }

    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Push notification permission not granted');
        return false;
      }

      // Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(userId, this.subscription);
      
      console.log('Push notification subscription successful');
      return true;
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription) {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return true;

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        credentials: 'include'
      });
      
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }

  // Show local notification
  showNotification(payload: PushNotificationPayload) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/assets/images/logo.png',
        badge: payload.badge || '/assets/images/logo.png',
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions
      });
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const pushNotificationService = new PushNotificationService();
