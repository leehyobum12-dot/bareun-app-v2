// supabase/functions/delete-account/index.ts
//
// [v3.2] 회원 탈퇴 Edge Function (단일 트랜잭션)
//
// 역할:
//   1. JWT 검증 (Anon Key)
//   2. Service Role로 Storage 파일 삭제
//   3. Service Role로 비즈니스 데이터 정리
//   4. Auth Admin API로 auth.users 삭제 (CASCADE 자동 발동)
//
// 출처: Supabase Auth Admin API
// https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST 요청만 허용됩니다.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('로그인이 필요합니다.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
    }

    // ─────────────────────────────────────────────
    // Step 1: JWT 검증 (Anon Key 사용)
    // ─────────────────────────────────────────────
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('유효하지 않은 사용자 토큰입니다.')
    }

    // 관리자 계정 방어
    const { data: profile } = await userClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type === 'admin') {
      throw new Error('관리자 계정은 탈퇴할 수 없습니다.')
    }

    // ─────────────────────────────────────────────
    // Step 2: Service Role 클라이언트 준비
    // ─────────────────────────────────────────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // ─────────────────────────────────────────────
    // Step A: Storage 파일 경로 수집 (삭제 전에 반드시!)
    // ─────────────────────────────────────────────
    const { data: verifications } = await adminClient
      .from('owner_verifications')
      .select('biz_reg_url, cert_paths')
      .eq('owner_id', user.id)

    const filesToDelete: string[] = []
    if (verifications && verifications.length > 0) {
      verifications.forEach((v) => {
        // 사업자 등록증 경로 수집 (자신의 UID 폴더만)
        if (v.biz_reg_url?.startsWith(`${user.id}/`)) {
          filesToDelete.push(v.biz_reg_url)
        }
        // 배지 인증서 경로 수집 (4개 키 순회)
        if (v.cert_paths && typeof v.cert_paths === 'object') {
          Object.values(v.cert_paths).forEach((path) => {
            if (typeof path === 'string' && path.startsWith(`${user.id}/`)) {
              filesToDelete.push(path)
            }
          })
        }
      })
    }

    // ─────────────────────────────────────────────
    // Step B: Storage 파일 삭제
    // ─────────────────────────────────────────────
    if (filesToDelete.length > 0) {
      const { error: storageError } = await adminClient.storage
        .from('business_docs')
        .remove(filesToDelete)

      if (storageError) {
        console.error('Storage 파일 삭제 실패 (계속 진행):', storageError)
        // Storage 삭제 실패해도 DB 정리는 계속 진행
      }
    }

    // ─────────────────────────────────────────────
    // Step C: 비즈니스 데이터 정리 (Service Role)
    // ─────────────────────────────────────────────

    // C-1: 미승인 가게 폐업 처리
    await adminClient
      .from('restaurants')
      .update({ is_closed: true })
      .eq('owner_id', user.id)
      .eq('is_verified', false)

    // C-2: 모든 가게 소유권 해제 (owner_id → NULL)
    // FK ON DELETE SET NULL이지만 명시적 해제가 안전
    await adminClient
      .from('restaurants')
      .update({ owner_id: null })
      .eq('owner_id', user.id)

    // C-3: 심사 요청 삭제 (CASCADE 있지만 명시적 삭제)
    await adminClient
      .from('owner_verifications')
      .delete()
      .eq('owner_id', user.id)

    // ─────────────────────────────────────────────
    // Step D: auth.users 삭제 (CASCADE 자동 발동)
    // → profiles, user_health, device_tokens, notifications 자동 삭제
    // ─────────────────────────────────────────────
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw new Error(`인증 서버 사용자 삭제 실패: ${deleteError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: '회원 탈퇴 완료' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('delete-account Edge Function 에러:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : '탈퇴 처리 중 알 수 없는 오류 발생'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})