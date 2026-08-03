// src/sw.js
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// 빌드 자산 precache
precacheAndRoute(self.__WB_MANIFEST)

// SPA 내비게이션 폴백 (구 navigateFallback)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// ── 기존 runtimeCaching 이관 ──
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({ cacheName: 'supabase-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })] })
)
registerRoute(
  ({ url }) => url.hostname.endsWith('.tile.openstreetmap.org'),
  new CacheFirst({ cacheName: 'osm-tiles',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })] })
)
registerRoute(
  ({ url }) => url.hostname.includes('cdnjs.cloudflare.com') && url.pathname.includes('/leaflet/'),
  new CacheFirst({ cacheName: 'leaflet-cdn',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 })] })
)
registerRoute(
  ({ url }) => url.hostname === 't1.daumcdn.net',
  new CacheFirst({ cacheName: 'daum-postcode',
    plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 })] })
)

// ── Web Push 수신 ──
self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, deeplink } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      data: { deeplink },
    })
  )
})

// 알림 클릭 → 딥링크(7-c-1)로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const deeplink = event.notification.data?.deeplink ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(deeplink); return client.focus() }
      }
      return self.clients.openWindow(deeplink)
    })
  )
})