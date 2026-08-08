// ===============================
// SERVICE WORKER (optional PWA support, §35)
// Caches only static shell files (CSS/JS/icons) — never Firestore reads,
// so posts/settings/stats always come from the network fresh. This keeps
// the app simple to deploy on Firebase Hosting without fighting stale
// cached data.
//
// WHAT TO EDIT: bump CACHE_NAME whenever you change any file in
// SHELL_FILES, so returning visitors get the new version instead of a
// stale cached copy.
// ===============================

const CACHE_NAME = "gom3u-shell-v1";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/search.html",
  "/css/style.css",
  "/css/responsive.css",
  "/js/utils.js",
  "/js/app.js",
  "/assets/icons/icon-192.png",
  "/assets/default-thumbnail.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase/Firestore/Storage/Auth traffic — always go
  // to the network so data stays live.
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com") || url.hostname.includes("gstatic.com")) {
    return;
  }

  // Cache-first for same-origin static shell files only.
  if (url.origin === self.location.origin && SHELL_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
