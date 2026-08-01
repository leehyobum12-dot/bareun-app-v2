// src/core/lib/supabase.js

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/core/config/env'

/**
 * [L-2 수정] PKCE 플로우 활성화
 *
 * 근거: OAuth 2.1 RFC Draft — PKCE is mandatory for public clients
 * - implicit: access token이 URL fragment에 노출 (브라우저 히스토리, 로그)
 * - pkce: code_verifier/code_challenge로 토큰 교환, 노출 없음
 *
 * detectSessionInUrl: OAuth 콜백 시 URL의 code 파라미터로 세션 자동 감지
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
})