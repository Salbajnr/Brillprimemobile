// push-notifications.ts
// Simple push notification utility for web (using the Notifications API)

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.reject('This browser does not support notifications.');
  }
  return Notification.requestPermission();
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

// Example: subscribe to a service worker for push (stub)
export async function subscribeToPush() {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    // This is a stub. In production, integrate with your push server/VAPID keys.
    // reg.pushManager.subscribe({ ... })
    return reg;
  }
  throw new Error('Service worker not supported');
}
