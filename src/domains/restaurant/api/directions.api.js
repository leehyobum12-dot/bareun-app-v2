// src/domains/restaurant/api/directions.api.js
//
// [v3.2 CTO 리팩토링]
//
// 변경:
// - OSRM 공개 데모 직접 호출 제거 (프로덕션 SLA 불가)
// - directions-proxy Edge Function 사용 (API 키 서버 측 관리)
//
// 출처: Supabase Edge Functions 공식 문서

import { supabase } from '@/core/lib/supabase'

/**
 * 자동차 경로 조회 (Edge Function 경유)
 *
 * @param {Object} start - { lat, lng }
 * @param {Object} goal  - { lat, lng }
 * @returns {{ path: [number, number][], summary: { distance: number, duration: number } }}
 *   - path: Leaflet용 [lat, lng][]
 *   - summary.distance: 미터
 *   - summary.duration: 밀리초
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

  if (error) {
    throw new Error('경로 조회에 실패했습니다.')
  }

  // Naver Directions API 응답 변환
  // Naver 응답: { route: { traoptimal: [{ path: [[lng, lat], ...] }] } }
  const route = data?.route?.traoptimal?.[0]
  
  if (!route || !route.path?.length) {
    throw new Error('경로를 찾을 수 없습니다.')
  }

  return {
    // Naver path: [lng, lat] → Leaflet [lat, lng]
    path: route.path.map(([lng, lat]) => [lat, lng]),
    summary: {
      distance: route.summary?.distance ?? 0,
      duration: route.summary?.duration ?? 0,
    },
  }
}