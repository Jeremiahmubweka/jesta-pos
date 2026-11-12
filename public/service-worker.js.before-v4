
const CACHE_NAME = "jesta-app-v3";

const APP_SHELL = [
  "/",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache the main application page.
      await cache.add("/");

      // Read the built HTML to discover the exact Vite asset filenames.
      const response = await cache.match("/");
      const html = await response.text();

      const assetUrls = [
        ...html.matchAll(/(?:src|href)="([^"]+)"/g),
      ]
        .map((match) => match[1])
        .filter((url) =>
          url.startsWith("/") &&
          /\.(js|css|svg|woff2?|png|jpg|jpeg|webp)(\?.*)?$/i.test(url)
        );

      // Cache each application asset individually.
      for (const url of [...new Set([...APP_SHELL, ...assetUrls])]) {
        try {
          await cache.add(url);
          console.log("JESTA cached:", url);
        } catch (error) {
          console.warn("JESTA could not cache:", url, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith("jesta-app-") &&
              name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      // For application navigation, use the cached application page
      // if the internet connection is unavailable.
      if (request.mode === "navigate") {
        try {
          return await fetch(request);
        } catch (error) {
          const cachedPage = await caches.match("/");
          if (cachedPage) return cachedPage;

          return new Response("JESTA is offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      }

      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response("This file is not available offline.", {
          status: 503,
        });
      }
    })()
  );
});
