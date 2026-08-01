// src/domains/auth/api/auth.api.js

import { supabase } from '@/core/lib/supabase'
import { toAppError } from '@/core/lib/api'
import { OAUTH_REDIRECT_URL } from '@/core/config/env'

/**
 * [L-6 수정] provider 화이트리스트
 * - 임의 문자열 전달 방지
 * - 카카오 OAuth 지원 (Q3 답변)
 */
const ALLOWED_PROVIDERS = ['google', 'kakao']

export const AuthApi = {
  /**
   * OAuth 로그인
   *
   * [수정 이력]
   * - L-1: redirectTo → OAUTH_REDIRECT_URL (Capacitor 대응)
   * - L-4: 원본 AuthError → toAppError 변환 (에러 일관성)
   * - L-6: provider 화이트리스트 검증
   */
  async signInWithOAuth(provider) {
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      throw toAppError(
        new Error(`Unsupported provider: ${provider}`),
        '지원하지 않는 로그인 방식입니다.'
      )
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: OAUTH_REDIRECT_URL,
        queryParams: provider === 'google'
          ? { prompt: 'select_account' }
          : undefined,
      },
    })

    if (error) {
      throw toAppError(error, '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  },
}