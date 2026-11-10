// يحفظ التطبيق وقارئ الصور وصور الخريطة في الجوال ليعمل دون إنترنت.
// غيّر رقم الإصدار عند أي تعديل حتى تصل النسخة الجديدة للأجهزة.
const C = 'pf-v2.4';
const TILES = 'pf-tiles';            // صور الخريطة: تبقى بين الإصدارات
const MAX_TILES = 4000;
const CORE = ['./', 'index.html', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

const ok = r => r && (r.ok || r.type === 'opaque');
const put = (cache, req, res) => { if (ok(res)) { const cp = res.clone(); caches.open(cache).then(c => c.put(req, cp)); } return res; };
let added = 0;
async function trim() {
  const c = await caches.open(TILES), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // صفحة التطبيق: من الشبكة أولاً (لتصل التحديثات)، وإلا من الذاكرة
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(r => put(C, req, r)).catch(() => caches.match(req).then(h => h || caches.match('index.html'))));
    return;
  }
  // صور الخريطة: من الذاكرة أولاً، وتُحفظ كل صورة تشاهدها
  if (/arcgisonline\.com|tile\.openstreetmap\.org/.test(url.hostname)) {
    e.respondWith(caches.open(TILES).then(c => c.match(req)).then(hit => hit || fetch(req).then(r => {
      put(TILES, req, r); if (++added % 200 === 0) trim(); return r; })));
    return;
  }
  // بقية الملفات (قارئ الصور، الخط، مكتبة الخريطة): من الذاكرة أولاً
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(C, req, r))));
});
