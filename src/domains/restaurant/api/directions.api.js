// src/domains/restaurant/api/directions.api.js
//
// [v3.2 CTO 최종 승인] Directions API (Edge Function 경유)
//
// 역할:
//   - directions-proxy Edge Function 호출
//   - 응답을 DirectionsModal에서 사용할 형태로 반환
//
// 출처: Supabase Edge Functions 공식 문서

import { supabase } from '@/core/lib/supabase'

/**
 * 자동차 경로 조회
 *
 * @param {Object} start - { lat, lng }
 * @param {Object} goal  - { lat, lng }
 * @returns {{ path: [number, number][], summary: { distance: number, duration: number, ... } }}
 *   - path: Leaflet용 [lat, lng][]
 *   - summary.distance: 미터
 *   - summary.duration: 밀리초
 */
export async function getDirections(start, goal) {
  const { data, error } = await supabase.functions.invoke('directions-proxy', {
    body: {
      startLat: start.lat,
      startLng: start.lng,
      goalLat: goal.lat,
      goalLng: goal.lng,
    },
  })

  if (error) {
    console.error('[directions.api] Edge Function 오류:', error)
    throw new Error(error.message || '경로 조회에 실패했습니다.')
  }

  if (!data?.path?.length) {
    throw new Error('경로를 찾을 수 없습니다.')
  }

  return {
    path: data.path,
    summary: {
      distance: data.summary.distance,
      duration: data.summary.duration,
      taxiFare: data.summary.taxiFare,
      tollFare: data.summary.tollFare,
    },
  }
}