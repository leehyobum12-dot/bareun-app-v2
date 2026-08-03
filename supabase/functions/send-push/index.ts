import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')

/* [CORS] directions-proxy 와 동일 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:admin@bareun.app', VAPID_PUBLIC, VAPID_PRIVATE)
}

Deno.serve(async (req) => {
  console.log('[send-push] 호출됨')

  /* Preflight */
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  /* ── [보안] 호출자 검증: admin 만 발송 가능 ── */
  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user } } = await createClient(
    url, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser()
  console.log('[send-push] 호출자:', user?.id)

  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
  }
  const { data: profile } = await admin
    .from('profiles').select('user_type').eq('id', user.id).single()
  console.log('[send-push] user_type:', profile?.user_type)
  if (profile?.user_type !== 'admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
  }

  /* ── 발송 ── */
  const { userIds, title, body, deeplink } = await req.json()
  console.log('[send-push] 수신자:', userIds, '제목:', title)

  const { error: notiErr } = await admin.from('notifications').insert(
    userIds.map((uid:string) => ({ user_id: uid, title, body, deeplink, is_read: false }))
  )
  console.log('[send-push] notifications 기록:', notiErr?.message ?? 'ok')

  const { data: tokens, error: tokErr } = await admin
    .from('device_tokens').select('token, keys')
    .in('user_id', userIds).eq('platform', 'web')
  console.log('[send-push] tokens 수:', tokens?.length, '에러:', tokErr?.message ?? '없음')

  if (!tokens?.length) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200, headers: corsHeaders })
  }

  const payload = JSON.stringify({ title, body, deeplink })
  const results = await Promise.allSettled(
    tokens.map(t => webpush.sendNotification({ endpoint: t.token, keys: t.keys }, payload))
  )
  console.log('[send-push] 발송 결과:', JSON.stringify(results.map(r => r.status === 'fulfilled' ? 'ok' : r.reason?.message)))

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200, headers: corsHeaders })
})