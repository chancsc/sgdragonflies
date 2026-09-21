/*
 * App-shell offline cache for Dragonflies of Singapore.
 *
 * The original build relied on an IndexedDB/WebSQL shim (see scripts/main-built.js)
 * to persist Backbone models. That only ever covered app *data*, never the HTML/CSS/JS
 * assets themselves, and no service worker or AppCache manifest was ever registered
 * for those. WebSQL is now gone from browsers, so even the data shim no longer
 * initializes cleanly. This worker replaces the missing asset-caching layer with a
 * standard cache-first service worker so the app shell loads with no network at all.
 */

var CACHE_VERSION = 'sgdragonfly-shell-v1';

var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.min.css',
  './styles/icons.png',
  './styles/icons@2x.png',
  './styles/loader.gif',
  './styles/error.gif',
  './styles/images/ajax-loader.gif',
  './scripts/libs/require.min.js',
  './scripts/main-built.js',
  './images/favicon.ico',
  './images/app_logo.png',
  './images/sponsor_logo.png',
  './images/startup.png',
  './images/fblogo.png',
  './images/Icon-48.png',
  './images/Icon-72.png',
  './images/Icon-72@2x.png',
  './images/Icon-76.png',
  './images/Icon-76@2x.png',
  './images/Icon-96.png',
  './images/Icon-192.png',
  './images/Icon@2x.png',
  './images/Icon-60@3x.png',
  './images/welcome_1.jpg',
  './images/welcome_2.jpg',
  './images/welcome_3.jpg',
  './images/welcome_4.jpg',
  './images/welcome_5.jpg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations (e.g. opening the app fresh while offline) always fall back to the
  // cached shell, since routing inside the app is client-side (Backbone hash routes).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(function (cached) {
        return cached || fetch(request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(function () {
        // No cache, no network: nothing we can do for this asset.
        return cached;
      });
    })
  );
});
