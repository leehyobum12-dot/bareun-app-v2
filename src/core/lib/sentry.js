// src/core/lib/sentry.js

import * as Sentry from '@sentry/react'

/*
 * [Phase 5] Sentry 초기화
 * - dsn: .env의 VITE_SENTRY_DSN (Sentry 대시보드에서 발급)
 * - environment: development / production 자동 구분
 * - browserTracingIntegration: 페이지 로드·라우팅 성능 추적
 * - replayIntegration: 에러 발생 시 사용자 세션 녹화 (개인정보 마스킹 필수)
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  // DSN이 없으면 Sentry 비활성 (로컬 개발 시)
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN이 설정되지 않았습니다. Sentry가 비활성화됩니다.')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,       // 모든 텍스트 마스킹 (개인정보 보호)
        blockAllMedia: true,     // 미디어 차단
      }),
    ],
    // 성능 추적: 프로덕션 20%, 개발 100%
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // 세션 녹화: 평상시 10%, 에러 시 100%
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

export { Sentry }