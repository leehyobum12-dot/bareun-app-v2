// src/domains/admin/api/admin.api.js

import { from, rpc, run } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'
import { CERT_KEY_TO_NAME } from '@/shared/cert'

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
   * [v3.2 추가] 여러 인증 서류의 Signed URL 일괄 생성
   */
  async getSignedUrlsForCerts(certPaths) {
    if (!certPaths || typeof certPaths !== 'object') return {}

    const result = {}
    
    for (const [dbKey, path] of Object.entries(certPaths)) {
      if (path && typeof path === 'string') {
        try {
          const signedUrl = await this.getSignedUrl(path)
          // DB 키를 한글 이름으로 변환하여 반환
          const displayName = CERT_KEY_TO_NAME[dbKey] || dbKey
          result[displayName] = signedUrl
        } catch (error) {
          console.warn(`[AdminApi] ${dbKey} Signed URL 생성 실패:`, error)
        }
      }
    }

    return result
  },

  async approve(item) {
    return rpc(
      'approve_restaurant',
      { p_verification_id: item.id },
      '승인 처리에 실패했습니다.'
    )
  },

  /**
   * [v3.2 수정] 반려 처리 (사유 지원)
   * @param {Object} item - 심사 항목
   * @param {string} reason - 반려 사유
   */
  async reject(item, reason) {
    return rpc(
      'reject_restaurant',
      { p_verification_id: item.id, p_reason: reason },
      '반려 처리에 실패했습니다.'
    )
  },
}