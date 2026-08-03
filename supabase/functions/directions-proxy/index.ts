// supabase/functions/directions-proxy/index.ts

// ★ import 없음 — Deno.serve는 내장
const NAVER_API_URL = 'https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving'

Deno.serve(async (req) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { startLng, startLat, goalLng, goalLat } = await req.json()

    const res = await fetch(
      `${NAVER_API_URL}?start=${startLng},${startLat}&goal=${goalLng},${goalLat}&option=trafast`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': Deno.env.get('NAVER_MAP_CLIENT_ID') ?? '',
          'X-NCP-APIGW-API-KEY': Deno.env.get('NAVER_MAP_CLIENT_SECRET') ?? '',
        },
      }
    )

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})