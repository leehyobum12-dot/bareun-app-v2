// src/core/lib/geocode.js
import { supabase } from '@/core/lib/supabase'

/** 주소 → 좌표 변환 (Edge Function 경유) */
export async function geocodeAddress(query) {
  const { data, error } = await supabase.functions.invoke('geocode-proxy', {
    body: { query },
  })
  if (error) throw new Error('좌표 변환에 실패했습니다.')
  if (!data?.lat || !data?.lng) throw new Error('좌표를 찾을 수 없습니다.')
  return { lat: data.lat, lng: data.lng }
}