const CACHE_NAME = "kaasi-cache-v6.356m";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./tailwind.css",
  "./js/globals.js",
  "./js/data-sync.js",
  "./js/math-tool.js",
  "./js/settings.js",
  "./js/charts.js",
  "./js/ui.js",
  "./js/features.js",
  "./js/animations.js",
  "./js/security.js",
  "./js/app.js",
  "./img/LogoIcon.svg",
  "./img/LogoIcon_Maskable.svg",
  "./img/FullLogo.svg",
  "./img/AanjeloNoText.svg",
  "./img/LogoType.svg",
  "./fonts/Satoshi-Light.woff2",
  "./fonts/Satoshi-Regular.woff2",
  "./fonts/Satoshi-Medium.woff2",
  "./fonts/Satoshi-Bold.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.ttf",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.ttf",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

// Install Event: Cache initial static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches if CACHE_NAME changes
self.addEventListener("activate", (event) => {
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

// Fetch Event: Stale-While-Revalidate Strategy
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  // Ignore API requests (like Supabase) so they always go to the network
  if (event.request.url.includes("supabase.co")) return;
  
  // Ignore analytics and tag managers
  if (event.request.url.includes("googletagmanager.com") || event.request.url.includes("google-analytics.com")) return;
  
  // Ignore chrome extensions and other schemes
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Create a fetch promise to get the latest version from the network
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update the cache with the new network response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Network failed (offline).
        console.warn("Network request failed for:", event.request.url);
        // If we don't have a cached response, we must throw so the browser knows it failed.
        if (!cachedResponse) {
          throw err;
        }
      });

      // Keep the service worker alive until the fetch completes
      event.waitUntil(fetchPromise);

      // Return the cached response immediately if it exists, otherwise wait for the network
      return cachedResponse || fetchPromise;
    })
  );
});



