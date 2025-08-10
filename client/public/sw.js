
const CACHE_NAME = 'brill-prime-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push event
self.addEventListener('push', function(event) {
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Brill Prime',
        body: event.data.text(),
        icon: '/logo192.png'
      };
    }
  }

  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/logo192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    tag: notificationData.tag || 'general',
    requireInteraction: notificationData.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Brill Prime',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app to a specific URL if provided
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(urlToOpen);
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here
  return fetch('/api/sync')
    .then(response => {
      console.log('Background sync completed');
    })
    .catch(error => {
      console.error('Background sync failed:', error);
    });
}

// Message handling for communication with main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CLIENTS_CLAIM':
        self.clients.claim();
        break;
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});
