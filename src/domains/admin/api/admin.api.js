// src/domains/admin/api/admin.api.js

import { from, rpc, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

export const AdminApi = {
  async getPendingVerifications() {
    const { data } = await run(
      from('owner_verifications')
        .select('*, restaurants ( store_name, road_name, biz_type )')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      '심사 대기 목록을 불러오지 못했습니다.'
    )
    return data ?? []
  },

  async getSignedUrl(path) {
    if (!path) throw new Error('제출된 서류가 없습니다. (사장님이 서류를 다시 제출해야 합니다)')
    const { data } = await run(
      supabase.storage.from('business_docs').createSignedUrl(path, 300),
      '서명된 URL을 생성하지 못했습니다.'
    )
    return data.signedUrl
  },

  /**
   * [수정] 승인 처리
   * - 2개 쿼리 → RPC 1회 호출 (원자적)
   * - user_type 자동 전환 포함
   * - 중복 pending 레코드 정리 포함
   */
  async approve(item) {
    return rpc(
      'approve_restaurant',
      { p_verification_id: item.id },
      '승인 처리에 실패했습니다.'
    )
  },

  /**
   * [수정] 반려 처리
   * - RPC로 전환 (원자적 + 관리자 권한 검증)
   */
  async reject(item) {
    return rpc(
      'reject_restaurant',
      { p_verification_id: item.id, p_reason: null },
      '반려 처리에 실패했습니다.'
    )
  },
}