// src/domains/account/api/account.api.js
import { supabase } from '@/core/lib/supabase'

export const AccountApi = {
  /**
   * [Phase 1 수정] 회원 탈퇴
   * 
   * 변경 사항:
   * 1. Storage 파일 삭제 로직을 Edge Function으로 이관
   * 2. delete_user_account RPC 호출을 Edge Function 호출로 교체
   * 3. auth.users 삭제는 Edge Function 내부에서 Admin API로 처리
   * 
   * 근거: Supabase 공식 문서 - Auth Server Architecture
   * GoTrue 서버와 DB 상태 일관성을 위해 Admin API 사용 필수
   */
  async withdraw() {
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    })

    if (error) {
      throw new Error(error.message || '탈퇴 처리 중 문제가 발생했습니다.')
    }
  },
}