// يحفظ التطبيق وقارئ الصور في الجوال ليعمل دون إنترنت بعد أول فتح.
// غيّر رقم الإصدار عند أي تعديل حتى تصل النسخة الجديدة للأجهزة.
const C = 'pf-v2.2';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

// حذف النسخ القديمة (كانت تبقى للأبد في الإصدار الأول)
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // صفحة التطبيق نفسها: من الشبكة أولاً (لتصل التحديثات)، وإلا من الذاكرة
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(r => put(req, r)).catch(() => caches.match(req).then(h => h || caches.match('index.html'))));
    return;
  }
  // بقية الملفات (قارئ الصور، الخط، الأيقونة): من الذاكرة أولاً
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
});
