
const CACHE_NAME = 'brillprime-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  console.log('Push data:', data);

  const options = {
    body: data.body || 'New notification from Brillprime',
    icon: data.icon || '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: data.tag || 'brillprime-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.urgent || false,
    silent: false,
    vibrate: data.vibrate || [200, 100, 200]
  };

  // Add default actions based on notification type
  if (data.type === 'order') {
    options.actions = [
      {
        action: 'view_order',
        title: 'View Order',
        icon: '/assets/images/view_cart.png'
      },
      {
        action: 'mark_read',
        title: 'Mark as Read',
        icon: '/assets/images/check_icon.png'
      }
    ];
  } else if (data.type === 'delivery') {
    options.actions = [
      {
        action: 'accept_delivery',
        title: 'Accept',
        icon: '/assets/images/check_icon.png'
      },
      {
        action: 'view_details',
        title: 'View Details',
        icon: '/assets/images/view_cart.png'
      }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Brillprime', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const { action, notification } = event;
  const data = notification.data;

  // Send message to client
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        if (action) {
          // Handle action button click
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              payload: { action, data }
            });
          });
        } else {
          // Handle notification body click
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: { data, url: data.url }
            });
          });
          
          // If no client is open, open a new one
          if (clients.length === 0) {
            const urlToOpen = data.url || '/';
            return self.clients.openWindow(urlToOpen);
          } else {
            // Focus existing client
            return clients[0].focus();
          }
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification close analytics if needed
  event.waitUntil(
    fetch('/api/analytics/notification-closed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: event.notification.data.id,
        timestamp: Date.now()
      })
    }).catch(() => {
      // Ignore errors for analytics
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  try {
    // Sync pending notifications, orders, etc.
    console.log('Performing background sync');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
