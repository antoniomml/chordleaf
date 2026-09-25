// Chordleaf service worker: offline shell for the editor.
// Plain JavaScript on purpose: no imports, served from the site root so its
// scope is the whole origin. Bump CACHE_VERSION on every release (see
// docs/development.md); activation deletes the previous caches.
const CACHE_VERSION = "chordleaf-v1";

// Fetched during installation so the editor opens without a network.
const SHELL = [
  "/",
  "/es/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

const isCacheable = (response) => response && response.status === 200;

async function put(cache, request, response) {
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

// Navigation: fresh HTML when online, cached shell when the network fails.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    return await put(cache, request, await fetch(request));
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("/")) ||
      Response.error()
    );
  }
}

// Hashed Vite assets are immutable: serve from cache and fill it on miss.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    return await put(cache, request, await fetch(request));
  } catch {
    return Response.error();
  }
}

// Versionless public files: serve cached immediately and refresh in the
// background. The cached copy stays usable if the refresh fails.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => put(cache, request, response))
    .catch(() => cached || Response.error());
  return cached || network;
}

const isRevalidated = (url) =>
  url.pathname.startsWith("/fonts/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/licenses/") ||
  url.pathname === "/logo.svg";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("chordleaf-") && key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Same-origin only, and API responses are never stored.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/"))
    return;
  if (request.mode === "navigate") event.respondWith(networkFirst(request));
  else if (url.pathname.startsWith("/assets/"))
    event.respondWith(cacheFirst(request));
  else if (isRevalidated(url)) event.respondWith(staleWhileRevalidate(request));
});
