
const CACHE_NAME = 'brill-prime-v2.0';
const STATIC_CACHE = 'brill-prime-static-v2';
const DYNAMIC_CACHE = 'brill-prime-dynamic-v2';
const LOCATION_CACHE = 'brill-prime-location-v1';

const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Core app routes
  '/dashboard',
  '/driver-dashboard',
  '/merchant-dashboard',
  '/admin-dashboard',
  '/profile',
  '/wallet-balance',
  '/notifications'
];

const API_CACHE_PATTERNS = [
  '/api/auth/user',
  '/api/dashboard',
  '/api/wallet',
  '/api/notifications'
];

// Location tracking state
let isTrackingLocation = false;
let locationWatchId = null;
let locationUpdateInterval = null;

// Install event - Enhanced caching strategy
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(urlsToCache);
      }),
      
      // Initialize location cache
      caches.open(LOCATION_CACHE).then(cache => {
        console.log('Service Worker: Location cache initialized');
        return cache;
      }),
      
      // Initialize dynamic cache
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Service Worker: Dynamic cache initialized');
        return cache;
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('v2') && !cacheName.includes('v1')) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activation complete');
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
  console.log('Service Worker: Sync event triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationData());
  } else if (event.tag === 'offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function doBackgroundSync() {
  try {
    // Sync pending location updates
    await syncLocationData();
    
    // Sync offline actions
    await syncOfflineActions();
    
    // Sync cached API responses
    await syncCachedData();
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
    throw error;
  }
}

async function syncLocationData() {
  try {
    const locationCache = await caches.open(LOCATION_CACHE);
    const cachedRequests = await locationCache.keys();
    
    for (const request of cachedRequests) {
      if (request.url.includes('pending-location')) {
        const response = await locationCache.match(request);
        const locationData = await response.json();
        
        // Send to server
        const syncResponse = await fetch('/api/driver-location/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(locationData)
        });
        
        if (syncResponse.ok) {
          await locationCache.delete(request);
          console.log('Service Worker: Location data synced');
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Location sync failed:', error);
  }
}

async function syncOfflineActions() {
  try {
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const cachedRequests = await dynamicCache.keys();
    
    for (const request of cachedRequests) {
      if (request.url.includes('offline-action')) {
        const response = await dynamicCache.match(request);
        const actionData = await response.json();
        
        // Replay the action
        const syncResponse = await fetch(actionData.url, {
          method: actionData.method,
          headers: actionData.headers,
          body: actionData.body
        });
        
        if (syncResponse.ok) {
          await dynamicCache.delete(request);
          console.log('Service Worker: Offline action synced');
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Offline action sync failed:', error);
  }
}

async function syncCachedData() {
  try {
    // Refresh critical cached API responses
    const criticalAPIs = [
      '/api/auth/user',
      '/api/dashboard',
      '/api/wallet/balance'
    ];
    
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    
    for (const apiUrl of criticalAPIs) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          await dynamicCache.put(apiUrl, response.clone());
          console.log('Service Worker: API cache updated:', apiUrl);
        }
      } catch (error) {
        console.log('Service Worker: Failed to update cache for:', apiUrl);
      }
    }
  } catch (error) {
    console.error('Service Worker: Cache sync failed:', error);
  }
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
      case 'START_BACKGROUND_LOCATION':
        startBackgroundLocationTracking(event.data.options);
        break;
      case 'STOP_BACKGROUND_LOCATION':
        stopBackgroundLocationTracking();
        break;
      case 'CACHE_OFFLINE_ACTION':
        cacheOfflineAction(event.data.action);
        break;
      case 'UPDATE_APP':
        updateApp();
        break;
      default:
        console.log('Service Worker: Unknown message type:', event.data.type);
    }
  }
});

async function startBackgroundLocationTracking(options = {}) {
  console.log('Service Worker: Starting background location tracking');
  
  if (!isTrackingLocation) {
    isTrackingLocation = true;
    
    // Start periodic location updates
    locationUpdateInterval = setInterval(async () => {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now(),
                source: 'background'
              };
              
              // Try to send immediately
              try {
                const response = await fetch('/api/driver-location/update', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(locationData)
                });
                
                if (!response.ok) {
                  throw new Error('Network request failed');
                }
                
                console.log('Service Worker: Location updated in background');
              } catch (error) {
                // Cache for later sync
                await cacheLocationForSync(locationData);
                console.log('Service Worker: Location cached for sync');
              }
              
              // Notify foreground
              const clients = await self.clients.matchAll();
              clients.forEach(client => {
                client.postMessage({
                  type: 'LOCATION_UPDATE',
                  location: locationData
                });
              });
            },
            (error) => {
              console.error('Service Worker: Background location error:', error);
            },
            {
              enableHighAccuracy: options.enableHighAccuracy || false,
              timeout: options.timeout || 30000,
              maximumAge: options.maximumAge || 60000
            }
          );
        }
      } catch (error) {
        console.error('Service Worker: Location tracking error:', error);
      }
    }, options.interval || 30000); // Default 30 seconds for background
  }
}

function stopBackgroundLocationTracking() {
  console.log('Service Worker: Stopping background location tracking');
  
  isTrackingLocation = false;
  
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }
  
  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
}

async function cacheLocationForSync(locationData) {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    const cacheKey = `pending-location-${Date.now()}`;
    const response = new Response(JSON.stringify(locationData));
    await cache.put(cacheKey, response);
  } catch (error) {
    console.error('Service Worker: Failed to cache location:', error);
  }
}

async function cacheOfflineAction(action) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cacheKey = `offline-action-${Date.now()}`;
    const response = new Response(JSON.stringify(action));
    await cache.put(cacheKey, response);
    console.log('Service Worker: Offline action cached');
  } catch (error) {
    console.error('Service Worker: Failed to cache offline action:', error);
  }
}

async function updateApp() {
  try {
    // Clear old caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (!cacheName.includes('v2')) {
          return caches.delete(cacheName);
        }
      })
    );
    
    // Reload all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'APP_UPDATED' });
    });
    
    console.log('Service Worker: App updated');
  } catch (error) {
    console.error('Service Worker: App update failed:', error);
  }
}
