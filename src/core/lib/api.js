// src/core/lib/api.js
// 모든 DB 에러는 여기서 한국어 AppError로 변환됩니다

import { supabase } from './supabase'

/* ──────────────────────────────────────────────
   AppError
   ────────────────────────────────────────────── */
export class AppError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'AppError'
    this.cause = cause
  }
}

/* ──────────────────────────────────────────────
   에러 메시지 매핑
   [A-2 수정] duplicate key 패턴 추가
   ────────────────────────────────────────────── */
const MESSAGE_MAP = [
  [/relation .* does not exist/i, '서버 준비가 덜 되었습니다. 잠시 후 다시 시도해 주세요.'],
  [/row-level security/i, '접근 권한이 없습니다.'],
  [/foreign key constraint/i, '사용자 정보가 유효하지 않습니다. 다시 로그인해 주세요.'],
  [/Key is not present in table "users"/i, '사용자 정보가 유효하지 않습니다. 다시 로그인해 주세요.'],
  [/duplicate key value|already exists/i, '이미 처리된 요청입니다.'],
  [/jwt expired/i, '로그인이 만료되었습니다. 다시 로그인해 주세요.'],
  [/Failed to fetch|NetworkError/i, '네트워크 연결을 확인해 주세요.'],
]

/* ──────────────────────────────────────────────
   [A-1 수정] toAppError export 추가
   ────────────────────────────────────────────── */
export function toAppError(error, fallback) {
  const hit = MESSAGE_MAP.find(([re]) => re.test(error.message ?? ''))
  return new AppError(hit ? hit[1] : (fallback ?? error.message), error)
}

/* ──────────────────────────────────────────────
   [A-3 수정] 세션 만료 콜백 등록
   - AuthProvider에서 onSessionExpired를 등록
   - jwt expired 에러 발생 시 자동 호출
   ────────────────────────────────────────────── */
let _onSessionExpired = null

export function onSessionExpired(callback) {
  _onSessionExpired = callback
}

/* ──────────────────────────────────────────────
   RPC 헬퍼
   ────────────────────────────────────────────── */
export async function rpc(name, params, fallbackMsg) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) {
    const appError = toAppError(error, fallbackMsg)
    if (/jwt expired/i.test(error.message ?? '')) {
      _onSessionExpired?.()
    }
    throw appError
  }
  return data
}

/* ──────────────────────────────────────────────
   from 헬퍼
   ────────────────────────────────────────────── */
export function from(table) {
  return supabase.from(table)
}

/* ──────────────────────────────────────────────
   run 헬퍼
   [A-3 수정] jwt expired 감지 시 세션 만료 콜백 호출
   ────────────────────────────────────────────── */
export async function run(promise, fallbackMsg) {
  try {
    const result = await promise
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw result.error
    }
    return result
  } catch (e) {
    if (e instanceof AppError) throw e

    // jwt expired 감지 → 세션 만료 콜백
    if (/jwt expired/i.test(e.message ?? '')) {
      _onSessionExpired?.()
    }

    throw toAppError(e, fallbackMsg)
  }
}