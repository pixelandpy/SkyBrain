/* SkyBrain service worker
   ----------------------
   Purpose: PWA installability + instant startup. SkyBrain is intentionally an
   ONLINE game (product requirement), so this worker never pretends to support
   offline gameplay — offline simply shows the game's own "SIGNAL LOST" screen.
   The cache pre-warms the static app shell so an installed PWA opens fast.

   VERSIONING: bump CACHE on every deploy — old caches are purged on activate,
   and shell requests are revalidated in the background (stale-while-revalidate)
   so players never get stuck on a stale build. */

const CACHE = 'skybrain-shell-v7';
const SHELL_FILES = [
  'index.html',
  'blog.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/universe.css',
  'css/blog.css',
  'js/core/core.js',
  'js/core/audio.js',
  'js/data/content.js',
  'js/data/story.js',
  'js/data/astro.js',
  'js/games/games.js',
  'js/engine/selector.js',
  'js/engine/engine.js',
  'js/universe/universe.js',
  'js/ui/ui.js',
  'js/systems/systems.js',
  'js/systems/shipsys.js',
  'js/systems/expedition.js',
  'js/boot.js',
  'js/blog/articles.js',
  'js/blog/blog.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;      // outside requests pass through untouched
  if (e.request.method !== 'GET') return;

  const isShell = SHELL_FILES.some(f => url.pathname.endsWith(f));

  if (isShell) {
    /* stale-while-revalidate: instant startup + silent refresh to latest deploy */
    e.respondWith(
      caches.match(e.request).then(hit => {
        const refresh = fetch(e.request)
          .then(res => {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    );
  } else {
    /* network-first, best-effort cache fallback */
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
