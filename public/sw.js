const CACHE = "mercantil-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API or auth — always fresh from network
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.method !== "GET") return;

  // Personal financial HTML must always be fresh and must not be stored offline.
  if (event.request.destination === "document") return;

  const cacheFirst =
    url.pathname.startsWith("/_next/static/") ||
    ["script", "style", "font"].includes(event.request.destination);
  const staleWhileRevalidate =
    event.request.destination === "image" ||
    url.pathname === "/manifest.webmanifest";

  if (!cacheFirst && !staleWhileRevalidate) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached && cacheFirst) return cached;

      const network = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      });

      if (cached && staleWhileRevalidate) {
        event.waitUntil(network.catch(() => undefined));
        return cached;
      }

      return network.catch(() => cached ?? Response.error());
    }),
  );
});
