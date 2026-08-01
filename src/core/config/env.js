// src/core/config/env.js

/**
 * 환경 변수 중앙 관리
 *
 * [L-1 수정] OAuth 리디렉트 URL을 환경 변수로 분리
 * - 웹(PWA): VITE_OAUTH_REDIRECT_URL 미설정 시 window.location.origin 자동 사용
 * - Capacitor: .env에 VITE_OAUTH_REDIRECT_URL=bareunapp://callback 설정
 */
export const OAUTH_REDIRECT_URL =
  import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin

/**
 * Supabase URL / Anon Key
 * - supabase.js에서 직접 import.meta.env를 읽어도 되지만,
 *   환경 변수 접근을 이 파일로 통일하면 추후 검증 로직 추가 용이
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY