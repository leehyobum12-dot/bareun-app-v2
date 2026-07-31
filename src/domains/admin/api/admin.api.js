import { from, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

export const AdminApi = {
  async getPendingVerifications() {
    const { data } = await run(
      from('owner_verifications')
        .select('*, restaurants ( store_name, road_name, biz_type )')
        .eq('status', 'pending').order('created_at', { ascending: false }),
      '심사 대기 목록을 불러오지 못했습니다.'
    )
    return data ?? []
  },
  async getSignedUrl(path) {
    const { data } = await run(
      supabase.storage.from('business_docs').createSignedUrl(path, 300),
      '서명된 URL을 생성하지 못했습니다.'
    )
    return data.signedUrl
  },
  async approve(item) {
    await run(
      from('owner_verifications').update({ status: 'approved' }).eq('id', item.id),
      '심사 상태 변경에 실패했습니다.'
    )
    const { data } = await run(
      from('restaurants').update({ is_verified: true }).eq('id', item.restaurant_id).select(),
      '식당 승인 처리에 실패했습니다.'
    )
    if (!data || data.length === 0) throw new Error('권한(RLS) 문제로 식당 노출 처리에 실패했습니다. DB 정책을 확인하세요.')
  },
  async reject(item) {
    await run(from('owner_verifications').update({ status: 'rejected' }).eq('id', item.id), '반려 처리에 실패했습니다.')
  },
}