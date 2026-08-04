// src/domains/account/api/account.api.js

import { supabase } from '@/core/lib/supabase'
import { performFullCleanup, cleanupNativeStorage } from '@/core/security/cleanup'

export const AccountApi = {
  /**
   * [v3.2] 회원 탈퇴 (완전한 디지털 소멸)
   * 
   * 아키텍처:
   *   1. Edge Function 단일 호출로 DB + Auth 원자 처리 (좀비 계정 방지)
   *   2. 프론트엔드에서 5계층 완전 초기화 (데이터 잔존 방지)
   *   3. Capacitor 네이티브 스토리지까지 정리 (모바일 환경 대응)
   * 
   * 출처:
   *   - GDPR Article 17 (Right to be Forgotten)
   *   - Supabase Auth Admin API Documentation
   *   - DBA 피드백: 단일 트랜잭션 원자성 보장
   */
  async withdraw() {
    // ─── Step 1: 서버 측 완전 삭제 ───
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    })

    if (error) {
      // 서버에서 이미 삭제된 경우 (중복 호출 등)
      if (error.message?.includes('not found')) {
        console.warn('[AccountApi] 이미 삭제된 계정, 로컬만 정리')
      } else {
        throw new Error(error.message || '탈퇴 처리 중 문제가 발생했습니다.')
      }
    }

    // ─── Step 2: 프론트엔드 완전 초기화 ───
    const cleanupResults = await performFullCleanup({ hard: true })
    
    // ─── Step 3: 네이티브 스토리지 정리 (Capacitor) ───
    await cleanupNativeStorage()

    console.log('[AccountApi] 탈퇴 완료, 정리 결과:', cleanupResults)
    
    return { success: true, cleanup: cleanupResults }
  },

  /**
   * [선택] 세션 만료 시 정리 (logout보다 강력함)
   * AuthProvider의 onSessionExpired에서 사용 가능
   */
  async cleanupOnSessionExpired() {
    await performFullCleanup({ hard: false })  // SW는 유지
  },
}