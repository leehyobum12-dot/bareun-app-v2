import { from, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

export const AdminApi = {
  async getPendingVerifications() {
    const { data, error } = await from('owner_verifications')
      .select('*, restaurants ( store_name, road_name, biz_type )')
      .eq('status', 'pending').order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
  async getSignedUrl(path) {
    const { data, error } = await supabase.storage.from('business_docs').createSignedUrl(path, 300)
    if (error) throw error
    return data.signedUrl
  },
  async approve(item) {
    await run(from('owner_verifications').update({ status: 'approved' }).eq('id', item.id), '심사 상태 변경에 실패했습니다.')
    const { data, error } = await from('restaurants').update({ is_verified: true }).eq('id', item.restaurant_id).select()
    if (error) throw new Error(`식당 업데이트 통신 에러: ${error.message}`)
    if (!data || data.length === 0) throw new Error('권한(RLS) 문제로 식당 노출 처리에 실패했습니다. DB 정책을 확인하세요.')
  },
  async reject(item) {
    await run(from('owner_verifications').update({ status: 'rejected' }).eq('id', item.id), '반려 처리에 실패했습니다.')
  },
}