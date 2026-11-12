
const CACHE_NAME = "jesta-app-v4";

const APP_SHELL = [
  "/",
  "/favicon.svg",
];

// Install and cache the production application shell and its assets.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Fetch and cache the production HTML.
      const htmlResponse = await fetch("/", {
        cache: "no-cache",
      });

      if (!htmlResponse.ok) {
        throw new Error("Unable to download JESTA application HTML.");
      }

      await cache.put("/", htmlResponse.clone());

      const html = await htmlResponse.text();

      // Discover the exact Vite-generated JS, CSS and other asset names.
      const assetUrls = [
        ...html.matchAll(/(?:src|href)="([^"]+)"/g),
      ]
        .map((match) => match[1])
        .filter((url) =>
          url.startsWith("/") &&
          /\.(js|css|svg|woff2?|png|jpg|jpeg|webp)(\?.*)?$/i.test(url)
        );

      const filesToCache = [
        ...new Set([...APP_SHELL, ...assetUrls]),
      ];

      // Cache each file individually so one missing optional file
      // does not prevent the rest of the application from being cached.
      for (const url of filesToCache) {
        try {
          const response = await fetch(url, {
            cache: "no-cache",
          });

          if (response.ok) {
            await cache.put(url, response.clone());
            console.log("JESTA cached:", url);
          } else {
            console.warn(
              "JESTA could not cache:",
              url,
              response.status
            );
          }
        } catch (error) {
          console.warn("JESTA asset caching failed:", url, error);
        }
      }

      console.log("JESTA offline application cache installed.");

      await self.skipWaiting();
    })()
  );
});

// Activate the new version and remove old JESTA application caches.
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

      console.log("JESTA service worker activated:", CACHE_NAME);
    })()
  );
});

// Serve cached application files when offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept Supabase or other external requests.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      // Use the cached version immediately when available.
      if (cachedResponse) {
        return cachedResponse;
      }

      // For page navigation, try the network first.
      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put("/", response.clone());
          }

          return response;
        } catch (error) {
          const cachedPage = await cache.match("/");

          if (cachedPage) {
            return cachedPage;
          }

          return new Response("JESTA is offline.", {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        }
      }

      // For other files, try the network if they are not cached.
      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response(
          "This file is not available offline.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }
    })()
  );
});
