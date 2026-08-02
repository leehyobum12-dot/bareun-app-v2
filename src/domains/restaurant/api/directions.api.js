// src/domains/restaurant/api/directions.api.js

/*
 * [출구 전략] 라우팅 백엔드 = OSRM 공개 데모 (개발·검증 전용)
 *
 * ⚠️ 생산 사용 금지: router.project-osrm.org 는 테스트/공정사용 전용입니다.
 *    프로덕션 배포(Phase 7-d) 직전에 반드시 아래 후보 중 하나로 교체하십시오.
 *    교체는 이 파일 "내부만" 갈아끼우면 됩니다 (DirectionsModal/Home 무변경).
 *
 * [프로덕션 후보] (개방/정책 관측 후 택일)
 *   1) OSRM 자가 호스팅 (Docker + OSM 한국 추출) — 키/화이트리스트 함정 없음
 *   2) 카카오 Directions — 도로 경로 좌표 개방 여부·서버 호출 정책 "먼저 관측"
 *   3) NCP Directions 5 — 210(환경 정합성) 해결 시
 *
 * [응답 규격 통일]
 *   - path: Leaflet용 [lat, lng][]  (OSRM/NCP 모두 [lng, lat] 로 받아 변환)
 *   - summary.distance: 미터
 *   - summary.duration: "밀리초" 로 통일 (OSRM은 초 → *1000)
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

export async function getDirections(start, goal) {
  // 프로덕션에서 공개 데모가 나가는 것을 콘솔로 경고 (교체 누락 방지)
  if (import.meta.env.PROD) {
    console.warn(
      '[Directions] OSRM 공개 데모는 생산 사용 금지입니다. ' +
      '프로덕션 배포 전 라우팅 백엔드를 교체하십시오.'
    )
  }

  // OSRM 좌표 순서: 경도,위도
  const url =
    `${OSRM_BASE}/${start.lng},${start.lat};${goal.lng},${goal.lat}` +
    `?overview=full&geometries=geojson&steps=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error('경로 조회에 실패했습니다.')

  const data = await res.json()
  console.log('[OSRM 응답]', data)   // 관측용 (확정 후 제거 가능)

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('경로를 찾을 수 없습니다.')
  }

  const route = data.routes[0]

  return {
    // OSRM GeoJSON coordinates = [lng, lat] → Leaflet [lat, lng]
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    summary: {
      distance: route.distance,          // 미터 (그대로)
      duration: route.duration * 1000,   // 초 → 밀리초 (DirectionsModal 포맷과 통일)
    },
  }
}