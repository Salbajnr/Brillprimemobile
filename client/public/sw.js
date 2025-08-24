
const CACHE_NAME = 'brillprime-v1.2.0';
const CRITICAL_RESOURCES = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/pages/signin.tsx',
  '/src/pages/dashboard.tsx'
];

const API_CACHE_NAME = 'brillprime-api-v1';
const IMAGE_CACHE_NAME = 'brillprime-images-v1';

// Install event - cache critical resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== IMAGE_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE_NAME));
    return;
  }

  // Images - Cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    return;
  }

  // Static assets - Stale while revalidate
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }
});

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image not available', { status: 404 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(cacheName);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => null);

  return cachedResponse || await networkResponsePromise;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineActions());
  }
});

async function processOfflineActions() {
  const cache = await caches.open(API_CACHE_NAME);
  const offlineActions = await cache.match('/offline-actions');
  
  if (offlineActions) {
    const actions = await offlineActions.json();
    
    for (const action of actions) {
      try {
        await fetch(action.url, action.options);
        // Remove processed action
      } catch (error) {
        console.log('Failed to sync action:', error);
      }
    }
  }
}
