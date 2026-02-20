const CACHE_STATIC = "clima-static-v3";
const CACHE_DYNAMIC = "clima-dynamic-v1";

const STATIC_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./scripts.js",
  "./offline.html",
  "./img/icons.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_FILES))
  );
});

// ACTIVATE (limpa versões antigas)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    )
  );
});

// FETCH
self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // IGNORA APIs externas (Render, OpenWeather, Unsplash etc)
  if (url.origin !== location.origin) return;

  // NETWORK FIRST PARA HTML
  if (event.request.headers.get("accept").includes("text/html")) {

    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(event.request).then(r => r || caches.match("./offline.html"))
        )
    );

    return;
  }

  // CACHE FIRST PARA ASSETS
  event.respondWith(
    caches.match(event.request)
      .then(cacheRes => {
        if (cacheRes) return cacheRes;

        return fetch(event.request)
          .then(fetchRes => {
            const clone = fetchRes.clone();
            caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, clone));
            return fetchRes;
          });
      })
  );
});