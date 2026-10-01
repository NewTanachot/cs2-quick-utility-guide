const STATIC_CACHE = "cs2-smoke-static-v15";
const DATA_CACHE = "cs2-smoke-data-v15";

const MAP_ART = [
  "dust2",
  "mirage",
  "anubis",
  "inferno",
  "nuke",
  "ancient",
  "cache",
  "train",
  "overpass",
  "vertigo",
].map((slug) => `./assets/maps/${slug}.jpg`);

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./css/map-picker.css",
  "./js/app.js",
  "./js/map-cache.js",
  "./js/map-layout.js",
  "./js/site-zones.js",
  "./data/smokes.json",
  ...MAP_ART,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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
            .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isSmokeData(request) {
  const path = new URL(request.url).pathname;
  return path.endsWith("/data/smokes.json") || path.endsWith("smokes.json");
}

async function staleWhileRevalidate(request) {
  const dataCache = await caches.open(DATA_CACHE);
  const cached = await dataCache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        dataCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkFetch.catch(() => {});
    return cached;
  }

  const response = await networkFetch;
  if (response) return response;
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (isSmokeData(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
