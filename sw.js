const BUILD = "v6.436n";
const CACHE_NAME = `kaasi-cache-${BUILD}`;
const NAV_CACHE = 'kaasi-shell-navigation';
const pendingShells = new Map();
async function fresh(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('App update unavailable');
    // Read the body before clearing the deadline as well.
    const bytes = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.delete('content-encoding'); headers.delete('content-length');
    return new Response(bytes, {status:response.status, headers});
  } finally { clearTimeout(timer); }
}
async function verifiedShell(manifest) {
  if (!/^v\d+\.\d+[a-z]$/.test(manifest.version) || !manifest.files || !manifest.files['./index.html']) throw new Error('Invalid app manifest');
  const cache = await caches.open(`kaasi-cache-${manifest.version}`);
  const marker = await cache.match('./app-shell.json');
  if (marker && JSON.stringify(await marker.json()) === JSON.stringify(manifest) &&
    (await Promise.all(Object.keys(manifest.files).map(file => cache.match(file)))).every(Boolean)) return cache.match('./index.html');
  const key = JSON.stringify(manifest);
  if (pendingShells.has(key)) return (await pendingShells.get(key)).clone();
  const task = (async () => {
    const entries = await Promise.all(Object.entries(manifest.files).map(async ([file, expected]) => {
      const url = new URL(file, self.registration.scope);
      if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid app asset');
      if (file !== './index.html' && (!/\.(js|css)$/.test(url.pathname) || url.searchParams.get('v') !== manifest.version)) throw new Error('Mixed app versions in manifest');
      const response = await fresh(url.href);
      const bytes = new TextEncoder().encode((await response.clone().text()).replace(/\r\n/g,'\n'));
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2,'0')).join('');
      if (hash !== expected) throw new Error('App update is not completely published yet');
      return [file,response];
    }));
    for (const [file,response] of entries) await cache.put(file,response);
    await cache.put('./app-shell.json',new Response(JSON.stringify(manifest)));
    return cache.match('./index.html');
  })();
  pendingShells.set(key,task);
  try { return (await task).clone(); } finally { pendingShells.delete(key); }
}
async function navigationShell() {
  const navigation = await caches.open(NAV_CACHE);
  try {
    const manifest = await (await fresh(new URL('./app-shell.json',self.registration.scope).href)).json();
    const html = await verifiedShell(manifest);
    await navigation.put('./index.html',html.clone());
    await navigation.put('./app-shell.json',new Response(JSON.stringify(manifest)));
    return html;
  } catch (_) {
    return (await navigation.match('./index.html')) || (await (await caches.open(CACHE_NAME)).match('./index.html')) || Response.error();
  }
}
const STATIC_ASSETS = [
  "./",
  "./index.html",
  `./style.css?v=${BUILD}`,
  `./settings-workspace.css?v=${BUILD}`,
  `./tailwind.css?v=${BUILD}`,
  ...["globals", "import-validation", "storage", "storage-ui", "data-sync", "cloud-sync", "math-tool", "settings", "settings-workspace", "charts", "ui", "features", "animations", "subscription-assets", "subscription-services", "subscriptions", "security", "app"].map(name => `./js/${name}.js?v=${BUILD}`),
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
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0"
];

// Install Event: Cache initial static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const manifest = await (await fresh(new URL('./app-shell.json',self.registration.scope).href)).json();
      if (manifest.version !== BUILD) throw new Error('App release is still publishing');
      await verifiedShell(manifest);
      // Optional fonts/CDNs must not prevent a verified core release installing.
      await Promise.allSettled(STATIC_ASSETS.filter(file => file !== './' && !Object.hasOwn(manifest.files,file)).map(file => cache.addAll([file])));
    })
  );
  // Existing windows finish their work before an update takes control.
});

// Activate Event: Clean up old caches if CACHE_NAME changes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      // Keep the previous shell for already-open tabs during an update.
      const retained = cacheNames.filter(name => name.startsWith('kaasi-cache-')).slice(-2);
      const navigation = await caches.open(NAV_CACHE);
      const pointer = await navigation.match('./app-shell.json');
      if (pointer) retained.push(`kaasi-cache-${(await pointer.json()).version}`);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith("kaasi-cache-") && cacheName !== CACHE_NAME && !retained.includes(cacheName)) {
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
    const scope = new URL(self.registration.scope);
    if (url.pathname === scope.pathname || url.pathname === new URL('./index.html',scope).pathname) event.respondWith(navigationShell());
    return;
  }
  if (url.origin === self.location.origin && (event.request.destination === "script" || event.request.destination === "style")) {
    // Versioned assets are immutable within this cache; never mix builds.
    const version = url.searchParams.get('v');
    if (!version) return;
    if (!/^v\d+\.\d+[a-z]$/.test(version)) return;
    event.respondWith(caches.open(`kaasi-cache-${version}`).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      // A version query alone cannot make a deployed filename immutable.
      // Only serve bytes verified for that build; never fetch newer bytes under an old version.
      return Response.error();
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



