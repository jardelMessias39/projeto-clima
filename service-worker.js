const CACHE_NAME = "clima-v2";

const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./scripts.js",
  "./manifest.json",
  "./img/icon-192.png",
  "./img/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Cache aberto");
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error("Erro ao cachear:", err))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
