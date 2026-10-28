/* رِفْق — offline shell
   القاعدة: الصفحة نفسها تُجلَب من الشبكة أولًا (فتصلك أحدث نسخة فورًا)،
   ومع انقطاع الشبكة تعود للنسخة المحفوظة. لا مزيد من النسخ القديمة العالقة. */
const CACHE = 'rifq-v3';
const ASSETS = ['./refq.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    /* شبكة أولًا — أحدث نسخة دائمًا. وإن فشلت الشبكة، نخدم النسخة المحفوظة. */
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('./refq.html'))
          .then(hit => hit || new Response('offline', { status: 503, statusText: 'offline' })))
    );
    return;
  }

  /* بقية الملفات: من الذاكرة، وإن لم توجد فمن الشبكة. */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req))
  );
});

/* رسالةٌ من الصفحة لتفعيل التحديث فورًا */
self.addEventListener('message', e => {
  if (e.data === 'refresh') self.skipWaiting();
});
