// domains/auth/providers/AuthProvider.jsx
// 기존 useAuth의 장점(프로필 3회 재시도, localStorage 폴백, 완벽한 로그아웃)은 유지하되
// userType을 반드시 포함시킵니다 — 기존 버그(userType 누락) 수정.
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import { run } from '@/core/lib/api';
import { supabase } from '@/core/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const errorNotified = useRef(false);

  const buildUser = useCallback(async (authUser) => {
    // 트리거 동기화 지연 대비 프로필 재시도 조회
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const { data } = await run(
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        '프로필 데이터를 불러오지 못했습니다.'
      );
      if (data) { profile = data; break; }
      await new Promise(r => setTimeout(r, 400));
    }

    if (!profile) {
      const defaultNickname = authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.user_metadata?.preferred_username || '어르신';
      const defaultProvider = authUser.app_metadata?.provider || authUser.raw_app_meta_data?.provider || authUser.user_metadata?.provider || 'email';
      const fallbackProfile = {
        id: authUser.id,
        email: authUser.email,
        nickname: defaultNickname,
        provider: defaultProvider,
        user_type: 'member',
        onboarding_completed: false,
      };

      const { error: insertError } = await supabase.from('profiles').insert([fallbackProfile]);
      if (insertError) {
        if (/foreign key constraint|Key is not present in table \"users\"/i.test(insertError.message)) {
          await supabase.auth.signOut();
          throw new Error('로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요.');
        }
        if (!/duplicate key value|already exists/i.test(insertError.message)) {
          throw insertError;
        }
      }
      const { data } = await run(
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        '프로필 데이터를 불러오지 못했습니다.'
      );
      profile = data;
    }

    const { data: health } = await run(
      supabase.from('user_health').select('*').eq('id', authUser.id).maybeSingle(),
      '건강 정보를 불러오지 못했습니다.'
    );

    let avatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';
    if (avatar.startsWith('http://')) avatar = avatar.replace('http://', 'https://');

    return {
      id: authUser.id,
      name: profile?.nickname || authUser.user_metadata?.name || '어르신',
      email: profile?.email || authUser.email,
      avatar,
      provider: authUser.app_metadata?.provider || 'email',
      userType: profile?.user_type || 'member',   // ★ 기존 누락 버그 수정
      onboardingCompleted: !!profile?.onboarding_completed,
      termsAgreed: !!profile?.terms_agreed,
      healthProfile: health ? { diseases: health.diseases ?? [], stages: health.stages ?? {} } : { diseases: [], stages: {} },
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const sync = async (session) => {
      if (!session?.user) {
        if (mounted) { setUser(null); setLoading(false); }
        return;
      }
      try {
        const u = await buildUser(session.user);
        if (mounted) {
          errorNotified.current = false;
          setUser(u);
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthProvider] buildUser failed', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          if (!errorNotified.current) {
            toast.error(error.message || '로그인 처리 중 문제가 발생했습니다.');
            errorNotified.current = true;
          }
        }
      }
    };

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return data?.session;
      })
      .then(sync)
      .catch((error) => {
        console.error('[AuthProvider] getSession failed', error);
        if (mounted) { setUser(null); setLoading(false); }
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => sync(s));
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [buildUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.clear(); sessionStorage.clear();
    if ('caches' in window) {
      for (const key of await caches.keys()) await caches.delete(key);
    }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data?.session) setUser(await buildUser(data.session.user));
    } catch (error) {
      console.error('[AuthProvider] refresh failed', error);
    }
  }, [buildUser]);

  return <AuthContext.Provider value={{ user, setUser, loading, logout, refresh }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);