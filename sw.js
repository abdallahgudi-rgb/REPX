// REPX: abre rápido y funciona con mala señal. Código siempre fresco desde internet; imágenes guardadas.
const CACHE = "repx-v4";
const BASE = ["./", "index.html", "styles.css", "firebase.js", "tienda.js", "manifest.webmanifest", "img/logo-repx.png", "img/bulldog.png", "img/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("admin")) return; // el panel siempre directo
  const esImagen = /\.(png|webp|jpg|jpeg|svg)$/i.test(url.pathname);
  if (esImagen) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
    })));
    return;
  }
  // páginas, estilos y código: primero internet, si no hay, lo guardado
  e.respondWith(fetch(req).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
  }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html"))));
});
