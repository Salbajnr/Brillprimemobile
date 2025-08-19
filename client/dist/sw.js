const CACHE_NAME = 'brillprime-v2-performance';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const IMAGE_CACHE = 'images-v2';

const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Cache strategies by content type
const cacheStrategies = {
  static: ['/', '/static/', '/assets/', '/favicon.ico'],
  api: ['/api/'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf']
};

// Performance-optimized install
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(urlsToCache)),
      self.skipWaiting()
    ])
  );
});

// Intelligent caching with network-first for API, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, DYNAMIC_CACHE)
    );
    return;
  }

  // Handle images with cache-first strategy
  if (cacheStrategies.images.some(ext => url.pathname.includes(ext))) {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // Handle static assets with stale-while-revalidate
  if (cacheStrategies.static.some(path => url.pathname.startsWith(path))) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, STATIC_CACHE)
    );
    return;
  }

  // Default to network-first
  event.respondWith(
    networkFirstStrategy(request, DYNAMIC_CACHE)
  );
});

// Cache strategies
async function networkFirstStrategy(request, cacheName) {
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

async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

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

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}