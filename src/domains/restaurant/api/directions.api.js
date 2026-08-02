// src/domains/restaurant/api/directions.api.js

import { supabase } from '@/core/lib/supabase'

/**
 * 네이버 Directions API — Supabase Edge Function 프록시 경유
 *
 * [보안] API 키는 Edge Function 서버 환경 변수에만 존재
 *        클라이언트 번들에 포함되지 않음
 * [CORS] Edge Function이 Access-Control-Allow-Origin 헤더 추가
 *        개발/프로덕션 동일하게 동작
 */
export async function getDirections(start, goal) {
  const { data, error } = await supabase.functions.invoke('directions-proxy', {
    body: {
      startLng: start.lng,
      startLat: start.lat,
      goalLng: goal.lng,
      goalLat: goal.lat,
    },
  })

  if (error) throw new Error('경로 조회에 실패했습니다.')

  const route = data.route?.trafast?.[0]
  if (!route) throw new Error('경로를 찾을 수 없습니다.')

  return {
    // 네이버 [lng, lat] → Leaflet [lat, lng] 변환
    path: route.path.map(([lng, lat]) => [lat, lng]),
    summary: {
      distance: route.summary.distance,   // 미터
      duration: route.summary.duration,   // 밀리초
    },
  }
}