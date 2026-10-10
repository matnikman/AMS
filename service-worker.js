/* ============================================================
   AMS — Service Worker
   Hybrid strategy:
     - HTML / JS / CSS / fonts / icons  →  Cache-First
     - PDF.js worker (.mjs)             →  Cache-First
     - Everything else                  →  Network-First (fallback to cache)
   Fully offline-capable after first load.
   ============================================================ */

const CACHE_VERSION = "ams-v3-r9";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/* Files to precache — the app shell */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",

  /* Styles */
  "./styles/main.css",
  "./styles/fonts.css",
  "./styles/variables.css",
  "./styles/themes.css",
  "./styles/header.css",
  "./styles/tabbar.css",
  "./styles/cards.css",
  "./styles/buttons.css",
  "./styles/table.css",
  "./styles/forms.css",
  "./styles/attendance.css",
  "./styles/settings.css",
  "./styles/students.css",
  "./styles/import.css",
  "./styles/toast.css",

  /* Fonts */
  "./fonts/Vazirmatn-Regular.woff2",
  "./fonts/Vazirmatn-Bold.woff2",

  /* Icons */
  "./icons/icon-64.png",
  "./icons/icon-128.png",
  "./icons/icon-256.png",
  "./icons/icon-512.png",

  /* JS — main */
  "./js/main.js",

  /* JS — core */
  "./js/core/theme-boot.js",
  "./js/core/storage.js",
  "./js/core/settings.js",
  "./js/core/log.js",
  "./js/core/toast.js",
  "./js/core/numbers.js",
  "./js/core/grades.js",
  "./js/core/pwa.js",

  /* JS — utils */
  "./js/utils/jalali.js",
  "./js/utils/format.js",

  /* JS — data */
  "./js/data/store.js",

  /* JS — import */
  "./js/import/pdfLoader.js",
  "./js/import/pdfParser.js",
  "./js/import/pdfDebug.js",

  /* JS — ui */
  "./js/ui/tabs.js",
  "./js/ui/modal.js",
  "./js/ui/tableSort.js",
  "./js/ui/search.js",
  "./js/ui/courseList.js",
  "./js/ui/currentTab.js",
  "./js/ui/attendance.js",
  "./js/ui/sessionDatesModal.js",
  "./js/ui/addStudentModal.js",
  "./js/ui/studentModal.js",
  "./js/ui/gradeModal.js",
  "./js/ui/import.js",
  "./js/ui/settings.js",
  "./js/ui/themePicker.js",
  "./js/ui/studentsTab.js",

  /* PDF.js library */
  "./lib/pdf.mjs",
  "./lib/pdf.worker.mjs",
];

/* ============================================================
   Install — precache the app shell
   ============================================================ */

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        /* Use addAll for atomic precache; if any fails, the whole install fails */
        return cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))
        );
      })
      .then(() => {
        console.log("[SW] Precache complete.");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("[SW] Precache failed:", err);
      })
  );
});

/* ============================================================
   Activate — clean up old caches
   ============================================================ */

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => {
        console.log("[SW] Activation complete.");
        return self.clients.claim();
      })
  );
});

/* ============================================================
   Fetch — hybrid strategy
   ============================================================ */

/* File extensions that should use cache-first */
const CACHE_FIRST_EXT = [
  ".html", ".css", ".js", ".mjs",
  ".woff", ".woff2", ".ttf", ".otf",
  ".png", ".jpg", ".jpeg", ".svg", ".webp",
  ".json",
];

function shouldCacheFirst(url) {
  const u = new URL(url);
  const path = u.pathname.toLowerCase();
  return CACHE_FIRST_EXT.some((ext) => path.endsWith(ext));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  /* Only handle GET */
  if (req.method !== "GET") return;

  /* Ignore cross-origin requests (except same-origin) */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (shouldCacheFirst(req.url)) {
    /* Cache-first */
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            /* Cache successful responses */
            if (res && res.status === 200 && res.type === "basic") {
              const clone = res.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
            }
            return res;
          })
          .catch(() => {
            /* Offline fallback: try index.html for navigation requests */
            if (req.mode === "navigate") {
              return caches.match("./index.html");
            }
            throw new Error("Offline and not cached: " + req.url);
          });
      })
    );
  } else {
    /* Network-first */
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});

/* ============================================================
   Message — allow the page to trigger skipWaiting
   ============================================================ */

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});