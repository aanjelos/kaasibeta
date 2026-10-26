const BUILD = "v6.415n";
importScripts(`./js/subscription-assets.js?v=${BUILD}`);
const CACHE_NAME = `kaasi-cache-${BUILD}`;
const STATIC_ASSETS = [
  "./",
  "./index.html",
  `./style.css?v=${BUILD}`,
  `./tailwind.css?v=${BUILD}`,
  ...["globals", "import-validation", "storage", "storage-ui", "data-sync", "cloud-sync", "math-tool", "settings", "charts", "ui", "features", "animations", "subscription-assets", "subscription-services", "subscriptions", "security", "app"].map(name => `./js/${name}.js?v=${BUILD}`),
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
  // Existing windows finish their work before an update takes control.
});

// Activate Event: Clean up old caches if CACHE_NAME changes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith("kaasi-cache-") && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("message", event => {
  if (event.data === "KAASI_APPLY_UPDATE") self.skipWaiting();
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

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.includes('/img/subscriptions/')) {
    // Logos are fetched only when displayed, then retained for offline reuse.
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }
  if (url.origin === self.location.origin && event.request.mode === "navigate") {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      return (await cache.match("./index.html")) || fetch(event.request);
    }));
    return;
  }
  if (url.origin === self.location.origin && (event.request.destination === "script" || event.request.destination === "style")) {
    // Versioned assets are immutable within this cache; never mix builds.
    if (url.searchParams.get("v") !== BUILD) return;
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }

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



