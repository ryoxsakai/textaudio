const CACHE = 'dke-shell-v12';
const SHELL = [
  '/',
  '/index.html',
  '/setting/',
  '/setting/index.html',
  '/bg.png',
  '/icon1.png',
  '/icon2.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
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
  const url = new URL(e.request.url);

  // R2 / Worker音声リクエストはすべてネットワークへ（IndexedDBで管理）
  if (
    url.hostname.endsWith('workers.dev') ||
    url.hostname.endsWith('r2.dev') ||
    url.pathname.endsWith('.mp3')
  ) return;

  // settings.json: ネットワーク優先、失敗時にキャッシュを返す
  if (url.pathname.endsWith('settings.json')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // その他（HTML・画像・CSS・フォント）: キャッシュ優先、なければネット取得してキャッシュ
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
    })
  );
});
