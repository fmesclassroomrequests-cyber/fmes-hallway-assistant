// FMES Hallway Assistant - service-worker.js
// v1 — Offline caching + PWA install support

const CACHE_NAME = "fmes-hallway-cache-v1";

const ASSETS_TO_CACHE = [
  "/fmes-hallway-assistant/",
  "/fmes-hallway-assistant/index.html",
  "/fmes-hallway-assistant/styles.css",
  "/fmes-hallway-assistant/app.js",
  "/fmes-hallway-assistant/manifest.json",
  "/fmes-hallway-assistant/icons/icon-192.png",
  "/fmes-hallway-assistant/icons/icon-512.png",
  "/fmes-hallway-assistant/icons/maskable-icon-192.png",
  "/fmes-hallway-assistant/icons/maskable-icon-512.png"
];

// Install event — cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event — cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event — network first, fallback to cache
self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache the new version
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, cloned);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});
