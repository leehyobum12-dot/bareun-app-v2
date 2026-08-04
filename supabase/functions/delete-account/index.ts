// supabase/functions/delete-account/index.ts
//
// 회원 탈퇴 Edge Function
//
// 역할:
//   1. 로그인한 사용자의 JWT를 검증
//   2. 사용자 권한으로 delete_user_account() RPC 호출 (비즈니스 데이터 정리)
//   3. service_role 권한으로 auth.users 삭제 (Admin API)
//   4. 관련 Storage 파일 정리
//
// 출처: Supabase 공식 문서 - Auth Admin API
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
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: 'Supabase 환경 변수가 설정되지 않았습니다.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 1. 사용자 JWT를 사용하는 클라이언트
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 2. 현재 로그인 사용자 확인
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 사용자 토큰입니다.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. 관리자 계정은 탈퇴 불가
    const { data: profile } = await userClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type === 'admin') {
      return new Response(
        JSON.stringify({ error: '관리자 계정은 탈퇴할 수 없습니다.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 4. Storage 파일 정리 (사업자 등록증 등 민감 문서)
    const { data: verifications } = await userClient
      .from('owner_verifications')
      .select('biz_reg_url, cert_paths')
      .eq('owner_id', user.id)

    const filesToDelete: string[] = []
    
    if (verifications && verifications.length > 0) {
      verifications.forEach((v) => {
        if (v.biz_reg_url) filesToDelete.push(v.biz_reg_url)
        if (v.cert_paths) {
          // cert_paths는 jsonb 객체이므로 값들을 추출
          Object.values(v.cert_paths).forEach((path) => {
            if (typeof path === 'string') filesToDelete.push(path)
          })
        }
      })
    }

    if (filesToDelete.length > 0) {
      const storageAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      
      const { error: storageError } = await storageAdmin
        .storage
        .from('business_docs')
        .remove(filesToDelete)

      if (storageError) {
        console.error('Storage 파일 삭제 실패:', storageError)
        // Storage 삭제 실패해도 계속 진행 (DB 정리가 더 중요)
      }
    }

    // 5. 사용자 권한으로 delete_user_account() RPC 실행
    //    restaurants.owner_id 해제, owner_verifications 삭제 등 진행
    const { error: rpcError } = await userClient.rpc('delete_user_account')

    if (rpcError) {
      console.error('delete_user_account RPC 실패:', rpcError)
      return new Response(
        JSON.stringify({
          error: '회원 탈퇴 데이터 정리 중 오류가 발생했습니다.',
          detail: rpcError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 6. 관리자 권한으로 실제 auth.users 삭제
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      user.id
    )

    if (deleteUserError) {
      console.error('auth.admin.deleteUser 실패:', deleteUserError)
      return new Response(
        JSON.stringify({
          error: '인증 서버에서 사용자 삭제 중 오류가 발생했습니다.',
          detail: deleteUserError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '회원 탈퇴가 완료되었습니다.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('delete-account Edge Function 오류:', error)

    return new Response(
      JSON.stringify({
        error: '회원 탈퇴 처리 중 예상하지 못한 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})