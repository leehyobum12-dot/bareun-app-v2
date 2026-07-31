const CACHE_NAME = 'bareun-app-v0.0.1';
const OFFLINE_URL = '/offline.html';

const PRECACHE = ['/', '/index.html', '/offline.html', '/manifest.json', '/icons.svg', '/favicon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // ★ GET만, 같은 도메인만, 인증/DB 통신은 절대 건드리지 않음
  if (request.method !== 'GET') return;
  if (request.url.includes('supabase.co') || request.url.includes('access_token=')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 내비게이션은 네트워크 우선 (배포 반영 즉시), 실패 시에만 캐시
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html').then(h => h || caches.match('/offline.html')))
    );
    return;
  }
  // 정적 자산만 Stale-While-Revalidate
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(request, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});