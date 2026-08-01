// src/domains/auth/providers/AuthProvider.jsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { useToast } from '@/app/providers/ToastProvider'
import { run, onSessionExpired } from '@/core/lib/api'
import { supabase } from '@/core/lib/supabase'

const AuthContext = createContext(null)

/**
 * [H-1 수정] buildUser를 호출할 이벤트만 허용
 * - SIGNED_IN: 신규 로그인 / OAuth 콜백
 * - SIGNED_OUT: 로그아웃
 * - USER_UPDATED: 유저 메타데이터 변경
 * - TOKEN_REFRESHED: 매 시간 발생 → 제외 (불필요한 DB 조회 방지)
 */
const SYNC_EVENTS = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED']

/**
 * [H-3 수정] 로그아웃 시 삭제할 캐시만 선별
 * - PWA 앱 셸 캐시(bareun-app-shell 등)는 유지 → 오프라인 동작 보장
 * - 동적 데이터 캐시만 삭제
 */
const CACHE_DELETE_PATTERN = /business-docs|supabase|dynamic/i

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const errorNotified = useRef(false)

  /* ──────────────────────────────────────────────
     buildUser: Supabase 세션 → 앱 user 객체 합성
     ────────────────────────────────────────────── */
  const buildUser = useCallback(async (authUser) => {
    // [기존 유지] 트리거 동기화 지연 대비 프로필 3회 재시도
    let profile = null
    for (let i = 0; i < 3; i++) {
      const { data } = await run(
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        '프로필 데이터를 불러오지 못했습니다.'
      )
      if (data) { profile = data; break }
      await new Promise(r => setTimeout(r, 400))
    }

    /*
     * [M-2 수정] fallback 프로필 생성 로직 제거
     *
     * 이유:
     * - handle_new_user 트리거(AFTER INSERT ON auth.users)가
     *   이미 profiles를 생성하므로 클라이언트 INSERT는 불필요
     * - 동시 INSERT 시 duplicate key 경쟁 조건 발생
     * - 3회 재시도 후에도 profile이 null이면 트리거 실패이므로
     *   에러를 던져 사용자에게 재로그인 안내
     */
    if (!profile) {
      /*
       * [방어적 fallback]
       * 스키마 재실행(DROP TABLE) 후 기존 사용자의 profiles가 삭제된 경우,
       * 또는 handle_new_user 트리거 지연/실패 시 클라이언트에서 직접 생성.
       * duplicate key 시 무시 (트리거가 이미 생성한 경우).
       */
      const defaultNickname =
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.preferred_username ||
        '어르신'
      const defaultProvider =
        authUser.app_metadata?.provider ||
        authUser.user_metadata?.provider ||
        'email'

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          nickname: defaultNickname,
          provider: defaultProvider,
          user_type: 'member',
          onboarding_completed: false,
        }])

      if (insertError) {
        // auth.users에 사용자가 없음 → 세션 무효
        if (/foreign key constraint|Key is not present in table "users"/i.test(insertError.message)) {
          await supabase.auth.signOut()
          throw new Error('로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요.')
        }
        // 트리거가 이미 생성 → 무시
        if (!/duplicate key value|already exists/i.test(insertError.message)) {
          throw insertError
        }
      }

      // INSERT 후 재조회
      const { data: retryData } = await run(
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        '프로필 데이터를 불러오지 못했습니다.'
      )
      profile = retryData

      if (!profile) {
        throw new Error('프로필 생성에 실패했습니다. 다시 로그인해 주세요.')
      }
    }

    const { data: health } = await run(
      supabase.from('user_health').select('*').eq('id', authUser.id).maybeSingle(),
      '건강 정보를 불러오지 못했습니다.'
    )

    let avatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      ''
    if (avatar.startsWith('http://')) {
      avatar = avatar.replace('http://', 'https://')
    }

    return {
      id: authUser.id,
      name: profile.nickname || authUser.user_metadata?.name || '어르신',
      email: profile.email || authUser.email,
      avatar,
      provider: authUser.app_metadata?.provider || 'email',
      userType: profile.user_type || 'member',
      onboardingCompleted: !!profile.onboarding_completed,
      termsAgreed: !!profile.terms_agreed,
      healthProfile: health
        ? { diseases: health.diseases ?? [], stages: health.stages ?? {} }
        : { diseases: [], stages: {} },
    }
  }, [])

  /* ──────────────────────────────────────────────
     세션 감시
     ────────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true
    /*
   * [A-3 수정] 세션 만료 시 자동 로그아웃 + 리디렉트
   * - api.js에서 jwt expired 감지 시 이 콜백 호출
   * - setUser(null) → RequireAuth가 /login으로 리디렉트
   */
    onSessionExpired(async () => {
      if (!mounted) return
      await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
      toast.error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
    })

    const sync = async (session) => {
      if (!session?.user) {
        if (mounted) { setUser(null); setLoading(false) }
        return
      }
      try {
        const u = await buildUser(session.user)
        if (mounted) {
          errorNotified.current = false
          setUser(u)
          setLoading(false)
        }
      } catch (error) {
        console.error('[AuthProvider] buildUser failed', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          if (!errorNotified.current) {
            toast.error(error.message || '로그인 처리 중 문제가 발생했습니다.')
            errorNotified.current = true
          }
        }
      }
    }

    // 초기 세션 확인
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error
        return data?.session
      })
      .then(sync)
      .catch((error) => {
        console.error('[AuthProvider] getSession failed', error)
        if (mounted) { setUser(null); setLoading(false) }
      })

    /*
     * [H-1 수정] 이벤트 필터링
     * - TOKEN_REFRESHED 등 불필요한 이벤트에서 buildUser 호출 차단
     * - 매 시간 발생하는 토큰 갱신 시 DB 조회 제거 → 비용 절감
     */
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (SYNC_EVENTS.includes(event)) {
        sync(session)
      }
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [buildUser, toast])

  /* ──────────────────────────────────────────────
     로그아웃
     ────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    await supabase.auth.signOut()

    /*
     * [H-3 수정] 선택적 캐시 삭제
     * - 앱 셸 캐시(bareun-static 등)는 유지 → 오프라인 앱 로드 보장
     * - 동적 데이터 캐시만 삭제
     *
     * [추가] localStorage/sessionStorage 전체 삭제 → Supabase 키만 삭제
     * - 전체 삭제 시 다른 도메인 데이터까지 제거되는 부작용 방지
     */
    const supabaseKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-')) supabaseKeys.push(key)
    }
    supabaseKeys.forEach((key) => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => CACHE_DELETE_PATTERN.test(key))
          .map((key) => caches.delete(key))
      )
    }

    setUser(null)
  }, [])

  /* ──────────────────────────────────────────────
     프로필 리프레시 (온보딩 완료 후 호출 등)
     ────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (data?.session) {
        setUser(await buildUser(data.session.user))
      }
    } catch (error) {
      console.error('[AuthProvider] refresh failed', error)
    }
  }, [buildUser])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)