/* Service worker: makes the globe installable and usable offline. */
const SHELL = 'shell-v4';
const RUNTIME = 'runtime-v1';
const TILES = 'tiles-v1';
const MAX_TILES = 3000;
const SHELL_FILES = ['./', './index.html', './style.css', './i18n.js', './app.js', './sensor.js',
  './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, name) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    cache.put(req, res.clone());
    if (max) trim(name, max);
  }
  return res;
}
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req, SHELL));
  else if (url.hostname === 'earthquake.usgs.gov') e.respondWith(networkFirst(req, RUNTIME));
  else if (/arcgisonline\.com|cartocdn\.com/.test(url.hostname)) e.respondWith(cacheFirst(req, TILES, MAX_TILES));
  else e.respondWith(cacheFirst(req, RUNTIME));
});
// end of sw.js
