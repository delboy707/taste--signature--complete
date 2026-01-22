// Service Worker for Taste Signature PWA
// Provides offline caching and improved performance

// Version: Update this when making significant changes
const VERSION = '3.2.0-stable';
const CACHE_NAME = `taste-signature-${VERSION}`;

// Files to cache (only static assets, not HTML/JS which need network-first)
const urlsToCache = [
  '/styles.css',
  '/mobile-responsive.css',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Files that should always fetch from network first (HTML, JS modules)
const networkFirstUrls = [
  '/',
  '/index.html',
  '/app.js',
  '/auth.js',
  '/config.js',
  '/firebase-config.js',
  '/team-collaboration.js',
  '/approval-workflow.js',
  '/temporal-analysis.js',
  '/photo-manager.js',
  '/recipe-tracker.js'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up OLD caches only
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating with version', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('📦 Found caches:', cacheNames);
      // Only delete OLD caches, keep the current one
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('taste-signature'))
          .map((name) => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated with cache version', CACHE_NAME);
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - network-first for HTML/JS, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Firebase, external APIs, and authentication requests
  // IMPORTANT: Do not cache any Firebase or authentication-related requests
  if (event.request.url.includes('firebasestorage.googleapis.com') ||
      event.request.url.includes('firebaseapp.com') ||
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com') ||
      event.request.url.includes('securetoken.googleapis.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('googleapis.com/identitytoolkit') ||
      event.request.url.includes('googleapis.com/securetoken') ||
      event.request.url.includes('anthropic.com') ||
      event.request.url.includes('api.anthropic.com') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('cdn.')) {
    // Always fetch fresh for these resources
    return fetch(event.request).catch(err => {
      console.error('Network request failed:', event.request.url, err);
      throw err;
    });
  }

  // Network-first strategy for HTML and JavaScript files
  const isHtmlOrJs = event.request.url.includes('.html') ||
                     event.request.url.includes('.js') ||
                     event.request.url === new URL('/', location).href;

  if (isHtmlOrJs) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for CSS, images, etc.
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
  }
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Sync any offline changes when connection restored
  console.log('🔄 Syncing offline data...');
  // Implementation would sync localStorage to Firestore
}

// Push notifications (optional - for future features)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'New notification from Taste Signature',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Taste Signature', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
