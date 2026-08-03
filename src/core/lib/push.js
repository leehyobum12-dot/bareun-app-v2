// src/core/lib/push.js
import { supabase } from '@/core/lib/supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

/* 알림 켜기 — 권한 요청 → subscribe → device_tokens upsert(멱등) */
export async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC) {
    return { ok: false, reason: 'unsupported' }
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    return { ok: false, reason: 'denied' }
  }

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  })

  const json = sub.toJSON()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { ok: false, reason: 'no-user' }

  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: data.user.id,
      token: json.endpoint,
      platform: 'web',
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
    { onConflict: 'user_id,token,platform' }
  )
  return { ok: !error, reason: error?.message }
}

function urlBase64ToUint8Array(s) {
  const padding = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}