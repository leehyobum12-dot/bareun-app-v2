import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  // subject 는 연락처(mailto:) — VAPID 표준
  webpush.setVapidDetails('mailto:admin@bareun.app', VAPID_PUBLIC, VAPID_PRIVATE)
}

Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  /* ── [보안] 호출자 검증: admin 만 발송 가능 ── */
  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: { user } } = await createClient(
    url, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  const { data: profile } = await admin
    .from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  /* ── 발송 ── */
  const { userIds, title, body, deeplink } = await req.json()

  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token, keys')
    .in('user_id', userIds)
    .eq('platform', 'web')          // 지금은 web 만 (7-d 에서 fcm/apns 분기)

  if (!tokens?.length) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { status: 200 })
  }

  const payload = JSON.stringify({ title, body, deeplink })
  const results = await Promise.allSettled(
    tokens.map(t => webpush.sendNotification({ endpoint: t.token, keys: t.keys }, payload))
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200 })
})