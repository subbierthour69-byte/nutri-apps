/* NutriClin · Service Worker — permite abrir la app sin internet.
   Al publicar una versión nueva de index.html cambia CACHE (p. ej. nutriclin-v2.3) para renovar los archivos guardados. */
const CACHE = 'nutriclin-v2.2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('nutriclin-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;               // solo archivos propios (WhatsApp, etc. pasan directo)
  if (r.mode === 'navigate') {                            // abrir la app: usa la copia guardada y la renueva si hay internet
    e.respondWith((async () => {
      const c = await caches.open(CACHE), hit = await c.match('./index.html');
      const upd = fetch('./index.html', { cache: 'no-cache' })
        .then(res => { if (res && res.ok) c.put('./index.html', res.clone()); return res; })
        .catch(() => null);
      if (hit) { e.waitUntil(upd); return hit; }
      return (await upd) || new Response('Sin conexión. Abre la app una vez con internet para guardarla.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => new Response('', { status: 504 }))));
});
