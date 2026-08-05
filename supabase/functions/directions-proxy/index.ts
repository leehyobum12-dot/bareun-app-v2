// supabase/functions/directions-proxy/index.ts
//
// [v3.2 CTO 최종 승인] Naver Directions 5 API 프록시
//
// 역할:
//   1. 클라이언트에서 전달받은 좌표로 Naver API 호출
//   2. Naver 응답을 Leaflet 형식으로 변환 (path: [lat, lng][])
//   3. 에러 핸들링 및 로깅
//
// Secrets (Supabase Dashboard에서 설정):
//   - NAVER_MAP_CLIENT_ID
//   - NAVER_MAP_CLIENT_SECRET
//
// 출처:
//   - Naver Cloud Platform Directions 5 API Guide
//   - Supabase Edge Functions 공식 문서

const NAVER_API_URL = 'https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST 요청만 허용됩니다.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ─────────────────────────────────────────────
    // 1. 입력 검증
    // ─────────────────────────────────────────────
    const body = await req.json()
    const { startLng, startLat, goalLng, goalLat } = body

    if (
      typeof startLng !== 'number' || typeof startLat !== 'number' ||
      typeof goalLng !== 'number' || typeof goalLat !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 좌표입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─────────────────────────────────────────────
    // 2. Secrets 확인
    // ─────────────────────────────────────────────
    const clientId = Deno.env.get('NAVER_DIRECTION_CLIENT_ID')
    const clientSecret = Deno.env.get('NAVER_DIRECTION_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('[directions-proxy] Secrets 미설정')
      return new Response(
        JSON.stringify({ error: '서버 설정 오류: API 키가 없습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─────────────────────────────────────────────
    // 3. Naver API 호출
    // ─────────────────────────────────────────────
    const naverUrl = `${NAVER_API_URL}?start=${startLng},${startLat}&goal=${goalLng},${goalLat}&option=traoptimal`

    const naverResponse = await fetch(naverUrl, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    })

    if (!naverResponse.ok) {
      const errorText = await naverResponse.text()
      console.error('[directions-proxy] Naver API 오류:', naverResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Naver API 오류: ${naverResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const naverData = await naverResponse.json()

    // ─────────────────────────────────────────────
    // 4. Naver 응답 검증
    // ─────────────────────────────────────────────
    if (naverData.code !== 0) {
      console.error('[directions-proxy] Naver 비즈니스 오류:', naverData.code, naverData.message)
      return new Response(
        JSON.stringify({
          error: naverData.message || '경로를 찾을 수 없습니다.',
          naverCode: naverData.code,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const route = naverData.route?.traoptimal?.[0]
    if (!route || !route.path?.length) {
      return new Response(
        JSON.stringify({ error: '경로를 생성할 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─────────────────────────────────────────────
    // 5. Leaflet 형식으로 변환
    // ─────────────────────────────────────────────
    // Naver path: [lng, lat][] → Leaflet [lat, lng][]
    const leafletPath = route.path.map(([lng, lat]: [number, number]) => [lat, lng])

    const result = {
      path: leafletPath,
      summary: {
        distance: route.summary.distance,    // 미터
        duration: route.summary.duration,    // 밀리초
        departureTime: route.summary.departureTime,
        taxiFare: route.summary.taxiFare,    // 택시 요금 (참고용)
        tollFare: route.summary.tollFare,    // 톨게이트 요금
        fuelPrice: route.summary.fuelPrice,  // 유류비
      },
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[directions-proxy] 예외 발생:', message)
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})