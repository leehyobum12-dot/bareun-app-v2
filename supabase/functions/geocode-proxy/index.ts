// supabase/functions/geocode-proxy/index.ts
// [v3.2.2] Geocoding 프록시 — Secrets로 키 관리, SDK/화이트리스트 무관

const NAVER_GEOCODE_URL = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { query } = await req.json()
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: '주소가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const res = await fetch(`${NAVER_GEOCODE_URL}?query=${encodeURIComponent(query)}`, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': Deno.env.get('NAVER_MAP_CLIENT_ID') ?? '',
        'X-NCP-APIGW-API-KEY': Deno.env.get('NAVER_MAP_CLIENT_SECRET') ?? '',
      },
    })

    const data = await res.json()
    const addr = data?.addresses?.[0]
    if (!addr) {
      return new Response(JSON.stringify({ error: '주소를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ lat: parseFloat(addr.y), lng: parseFloat(addr.x) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})