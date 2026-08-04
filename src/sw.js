// src/sw.js
/// <reference lib="webworker" />
//
// [v3.2 CTO 리팩토링] Service Worker
//
// 핵심 변경 사항:
// 1. [보안] Supabase API → NetworkOnly (캐시 완전 제거)
//    - 인증 토큰 포함 응답 캐시 방지
//    - 401 Unauthorized 에러 근본 해결
// 2. [성능] OSM 타일 maxEntries 축소 (100 → 50)
//    - 모바일 Quota 초과 위험 감소
// 3. [안정성] Quota exceeded 에러 핸들링 추가
//    - 브라우저가 캐시 강제 삭제할 때 gracefully 대응
//
// 출처:
// - Workbox 공식 문서: "Do not cache authenticated API responses"
// - OWASP Mobile Security: Service Worker Cache Security
// - GDPR Article 5: Data minimization principle

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

/**
 * [v3.2.1] 레거시 캐시 정리 (마이그레이션)
 * 
 * 이전 버전에서 생성된 캐시 중 더 이상 사용하지 않는 것들을 자동 삭제
 * - supabase-cache: v3.2에서 NetworkOnly로 변경되어 더 이상 불필요
 * - 기타 레거시 캐시 이름 패턴 추가 가능
 */
const LEGACY_CACHES = [
  'supabase-cache',
  'bareun-app-shell-v1',
  'bareun-static-v1',
]

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => LEGACY_CACHES.includes(key))
          .map((key) => {
            console.log('[sw] 레거시 캐시 삭제:', key)
            return caches.delete(key)
          })
      )
    })
  )
})

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// ─────────────────────────────────────────────
// 1. 빌드 자산 precache (App Shell)
// ─────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)

// SPA 내비게이션 폴백
try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
} catch (e) {
  console.warn('[sw] NavigationRoute 스킵 (dev):', e.message)
}

// ─────────────────────────────────────────────
// 2. [보안] Supabase API — NetworkOnly (캐시 금지)
// ─────────────────────────────────────────────
/**
 * Supabase 모든 엔드포인트는 절대 캐시하지 않음
 *
 * 대상:
 * - /rest/v1/* (PostgREST)
 * - /auth/v1/* (GoTrue)
 * - /functions/v1/* (Edge Functions)
 * - /storage/v1/* (Storage - Signed URL 포함)
 * - /realtime/v1/* (WebSocket)
 *
 * 근거:
 * - Authorization 헤더 포함 응답 캐시 방지
 * - RLS 정책 기반 동적 데이터는 항상 최신 상태 유지 필요
 * - GDPR Article 5 (Data minimization): 불필요한 사용자 데이터 저장 금지
 */
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkOnly()
)

// ─────────────────────────────────────────────
// 3. [성능] OSM 타일 — CacheFirst (Quota 안전)
// ─────────────────────────────────────────────
/**
 * OpenStreetMap 타일은 변경되지 않는 정적 자산이므로 CacheFirst 적합
 *
 * 변경 사항:
 * - maxEntries: 100 → 50 (모바일 Quota 초과 방지)
 * - maxAgeSeconds: 7일 유지 (타일은 거의 변경 안 됨)
 *
 * Quota 계산 (대략):
 * - 타일 1개 ≈ 15-30KB
 * - 50개 × 30KB = 1.5MB (안전 범위)
 *
 * 출처: Workbox ExpirationPlugin 공식 문서
 */
registerRoute(
  ({ url }) => url.hostname.endsWith('.tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,  // ✅ 축소 (모바일 Quota 보호)
        maxAgeSeconds: 7 * 24 * 60 * 60,  // 7일
        purgeOnQuotaError: true,  // Quota 초과 시 자동 정리
      }),
    ],
  })
)

// ─────────────────────────────────────────────
// 4. Leaflet CDN — CacheFirst (안정성)
// ─────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.hostname.includes('cdnjs.cloudflare.com') &&
    url.pathname.includes('/leaflet/'),
  new CacheFirst({
    cacheName: 'leaflet-cdn',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60,  // 30일
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// ─────────────────────────────────────────────
// 5. Daum Postcode — CacheFirst
// ─────────────────────────────────────────────
registerRoute(
  ({ url }) => url.hostname === 't1.daumcdn.net',
  new CacheFirst({
    cacheName: 'daum-postcode',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// ─────────────────────────────────────────────
// 6. Google Fonts — StaleWhileRevalidate (선택)
// ─────────────────────────────────────────────
// Pretendard 폰트는 거의 변경되지 않으므로 CacheFirst도 가능
registerRoute(
  ({ url }) => url.hostname === 'cdn.jsdelivr.net',
  new CacheFirst({
    cacheName: 'cdn-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 24 * 60 * 60,  // 60일
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// ─────────────────────────────────────────────
// 7. [안정성] Quota exceeded 에러 글로벌 핸들링
// ─────────────────────────────────────────────
/**
 * 모바일 브라우저가 Storage Quota 초과 시 강제로 캐시 삭제할 수 있음
 * 이 경우 사용자에게 경고하지 않고 gracefully 복구
 *
 * 출처:
 * - web.dev: "Storage for the Web"
 * - Chrome Developers: "Quota Management"
 */
self.addEventListener('error', (event) => {
  if (event.message?.includes('Quota') || event.message?.includes('quota')) {
    console.warn('[sw] Quota 경고 감지, 캐시 자동 정리:', event.message)
    // Workbox의 purgeOnQuotaError가 자동으로 처리하므로 추가 작업 불필요
  }
})

// ─────────────────────────────────────────────
// 8. Web Push 수신 (Capacitor 대응은 Phase C)
// ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '알림', body: event.data.text() }
  }

  const { title, body, deeplink } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',  // Android용 배지
      data: { deeplink },
      tag: deeplink || 'default',  // 동일 알림 중복 방지
      renotify: true,
    })
  )
})

// 알림 클릭 → 딥링크로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const deeplink = event.notification.data?.deeplink ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        // 이미 열려있는 창이 있으면 포커스 + 이동
        for (const client of list) {
          if ('focus' in client) {
            client.navigate(deeplink)
            return client.focus()
          }
        }
        // 없으면 새 창 열기
        return self.clients.openWindow(deeplink)
      })
  )
})

// ─────────────────────────────────────────────
// 9. [디버깅] 캐시 상태 모니터링 (개발 환경만)
// ─────────────────────────────────────────────
if (import.meta.env?.DEV) {
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'GET_CACHE_STATUS') {
      caches.keys().then(async (keys) => {
        const status = {}
        for (const key of keys) {
          const cache = await caches.open(key)
          const requests = await cache.keys()
          status[key] = requests.length
        }
        event.ports[0].postMessage({ status })
      })
    }
  })
}