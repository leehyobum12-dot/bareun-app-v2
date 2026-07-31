// core/lib/api.js — 모든 DB 에러는 여기서 한국어 AppError로 변환됩니다
import { supabase } from './supabase';

export class AppError extends Error {
  constructor(message, cause) { super(message); this.name = 'AppError'; this.cause = cause; }
}

const MESSAGE_MAP = [
  [/relation .* does not exist/i, '서버 준비가 덜 되었습니다. 잠시 후 다시 시도해 주세요.'],
  [/row-level security/i, '접근 권한이 없습니다.'],
  [/jwt expired/i, '로그인이 만료되었습니다. 다시 로그인해 주세요.'],
  [/Failed to fetch|NetworkError/i, '네트워크 연결을 확인해 주세요.'],
];

function toAppError(error, fallback) {
  const hit = MESSAGE_MAP.find(([re]) => re.test(error.message ?? ''));
  return new AppError(hit ? hit[1] : (fallback ?? error.message), error);
}

export async function rpc(name, params, fallbackMsg) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw toAppError(error, fallbackMsg);
  return data;
}

export function from(table) { return supabase.from(table); }

export async function run(promise, fallbackMsg) {
  try { return await promise; }
  catch (e) { throw e instanceof AppError ? e : toAppError(e, fallbackMsg); }
}