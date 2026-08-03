// src/core/lib/push.js
import { supabase } from '@/core/lib/supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

export async function getPushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC) return 'unsupported'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

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

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return { ok: true }
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    await supabase.from('device_tokens').delete().match({ user_id: data.user.id, token: endpoint })
  }
  return { ok: true }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}