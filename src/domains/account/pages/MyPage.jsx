import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { DISEASE_CATEGORIES } from '@/domains/onboarding/constants'
import { AccountApi } from '../api/account.api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { requestPushPermission, getPushState, disablePush } from '@/core/lib/push'
import { supabase } from '@/core/lib/supabase'
import './account.css'

const STAGE_LABEL = { stage1: '1단계', stage2: '2단계', grade1: '1등급', grade2: '2등급' }

export default function MyPage() {
  const { user, logout, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isOwner = user?.userType === 'owner'
  const queryClient = useQueryClient()
  const [pushOn, setPushOn] = useState(false)
  useEffect(() => {
    refresh?.()
    getPushState().then(s => setPushOn(s === 'on'))
  }, [])

  /* [알림] 목록 조회 */
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      return data ?? []
    },
  })

  /* [알림] 클릭 → 읽음 처리 + 딥링크 이동 */
  const handleNotiClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.deeplink) navigate(n.deeplink)
  }
  const handleTogglePush = async () => {
    if (pushOn) {
      await disablePush()
      setPushOn(false)
      toast.success('알림을 껐습니다.')
    } else {
      console.log('[push] VAPID_PUBLIC:', import.meta.env.VITE_VAPID_PUBLIC_KEY ? '설정됨' : '미설정')
      console.log('[push] SW 지원:', 'serviceWorker' in navigator)
      const r = await requestPushPermission()
      console.log('[push] 결과:', JSON.stringify(r))
      if (r.ok) { setPushOn(true); toast.success('알림이 켰습니다.') }
      else toast.error(`알림을 켤 수 없습니다 (${r.reason})`)
    }
  }

  const providerBadge = (p) => {
    if (p === 'kakao') return <span className="mp-provider mp-kakao">💬 카카오 계정 연동</span>
    if (p === 'google') return <span className="mp-provider mp-google">🇬 구글 계정 연동</span>
    return <span className="mp-provider">📧 이메일 계정</span>
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const withdraw = async () => {
    const msg = isOwner
      ? '정말 탈퇴하시겠습니까?\n사장님으로 등록하신 모든 서류가 파기되고 가게 소유권이 초기화됩니다.\n\n이 작업은 되돌릴 수 없습니다.'
      : '정말 탈퇴하시겠습니까?\n저장된 건강 필터와 프로필이 영구 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.'

    if (!window.confirm(msg)) return

    // [v3.2] 추가 확인 (이중 안전장치)
    if (!window.confirm('마지막 확인: 정말로 탈퇴하시겠습니까?')) return

    try {
      // 토스트는 초기화 전에 표시 (localStorage가 삭제되기 때문)
      toast.success('회원탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.')

      // 탈퇴 + 완전 초기화 실행
      await AccountApi.withdraw()

      // 짧은 딜레이 후 강제 리로드 (1.5초: 토스트 표시 시간)
      // window.location.href 대신 assign 사용 (브라우저 히스토리에서 제거)
      setTimeout(() => {
        window.location.replace('/login')
      }, 1500)
    } catch (e) {
      console.error('[MyPage] 탈퇴 실패:', e)
      toast.error(`탈퇴 처리 중 문제가 발생했습니다: ${e.message}`)
    }
  }

  return (
    <MobileFrame>
      <div className="mp-topbar">
        <button className="ow-back" onClick={() => navigate('/')} aria-label="뒤로">←</button>
        <strong>마이페이지</strong>
      </div>

      <section className="mp-profile reveal">
        <div className="mp-cover">
          {/* 🔔 알림 On/Off 토글 — 커버 오른쪽 상단 */}
          <button
            className={`mp-alarm-toggle ${pushOn ? 'on' : ''}`}
            onClick={handleTogglePush}
            aria-label={pushOn ? '알림 끄기' : '알림 켜기'}
          >
            {pushOn ? '🔔 알림 ON' : '🔕 알림 OFF'}
          </button>
        </div>
        <div className="mp-avatar">{(user?.name ?? '?').slice(0, 1)}</div>
        <div className="mp-profile-body">
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          {providerBadge(user?.provider)}
        </div>
      </section>

      <section className="card mp-section reveal" style={{ '--d': '60ms' }}>
        <div className="mp-section-head">
          <strong>🩺 건강 정보</strong>
          <button className="mp-edit" onClick={() => navigate('/health/step1')}>수정</button>
        </div>
        {user?.healthProfile?.diseases?.length > 0 ? (
          <div className="mp-diseases">
            {user.healthProfile.diseases.map((d) => {
              const cat = DISEASE_CATEGORIES.find((c) => c.diseases.includes(d)) ?? { name: '기타', icon: '🩺', color: 'var(--ink-500)', bg: 'var(--bg)' }
              const stage = user.healthProfile.stages?.[d]
              return (
                <div key={d} className="mp-disease" style={{ background: cat.bg }}>
                  <p style={{ color: cat.color }}>{cat.icon} {cat.name}</p>
                  <span style={{ color: cat.color, borderColor: `${cat.color}55` }}>
                    {d}{stage && stage !== 'unknown' && <small> ({STAGE_LABEL[stage] ?? stage})</small>}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mp-empty">등록된 건강 정보가 없어요.</p>
        )}
      </section>

      <section className="mp-section reveal" style={{ '--d': '100ms' }}>
        {isOwner ? (
          <button className="mp-cta mp-cta-dark" onClick={() => navigate('/owner')}>
            <span>👔 사장님 라운지로 돌아가기</span><span>→</span>
          </button>
        ) : (
          <button className="mp-cta" onClick={() => navigate('/owner')}>
            <span>🏪 가게 등록하고 사장님 되기</span><span>→</span>
          </button>
        )}
      </section>

      {/* 🔔 알림 목록 */}
      <section className="card mp-section reveal" style={{ '--d': '130ms' }}>
        <div className="mp-section-head">
          <strong>🔔 알림</strong>
        </div>
        {notifications.length === 0 ? (
          <p className="mp-empty">도착한 알림이 없어요.</p>
        ) : (
          <div className="mp-notis">
            {notifications.map((n) => (
              <button
                key={n.id}
                className={`mp-noti ${n.is_read ? 'read' : ''}`}
                onClick={() => handleNotiClick(n)}
              >
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <em>{new Date(n.created_at).toLocaleString('ko-KR')}</em>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mp-menu reveal" style={{ '--d': '140ms' }}>
        {[
          { icon: '💗', title: '찜한 식당', desc: '저장한 식당 목록 보기' },
          { icon: '💬', title: '이용 문의', desc: '불편사항 및 개선 요청' },
        ].map((m) => (
          <div key={m.title} className="mp-menu-row" onClick={m.onClick}>
            <span className="mp-menu-ic">{m.icon}</span>
            <div><strong>{m.title}</strong><small>{m.desc}</small></div>
            <span className="mp-menu-chev">›</span>
          </div>
        ))}
        {/* 로그아웃 행은 기존 그대로 유지 */}
        <div
          className="mp-menu-row"
          onClick={handleLogout}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogout()}
          role="button"
          tabIndex={0}
          aria-label="로그아웃"
        >
          <span className="mp-menu-ic">🚪</span>
          <div><strong>로그아웃</strong><small>현재 계정에서 로그아웃합니다</small></div>
          <span className="mp-menu-chev">›</span>
        </div>
      </section>

      <section className="mp-disclaimer reveal" style={{ '--d': '180ms' }}>
        <strong>⚠️ 의료/건강 정보 안내</strong>
        <p>본 서비스의 추천은 공공데이터 기반 일반 영양 정보이며 의학적 진단·처방을 대신할 수 없습니다. 취식 전 반드시 담당 의사와 상의하십시오.</p>
      </section>

      <div className="mp-withdraw">
        <button onClick={withdraw}>회원 탈퇴 및 데이터 삭제</button>
      </div>

      <footer className="mp-footer">
        <p>바른인증식당 v2.0 · 운영 책임자 이효범</p>
        <p>⚠️ 본 서비스의 식재료·영양 정보는 공공데이터 기반 추정치입니다.</p>
        <p>© 2026 바른인증식당. All rights reserved.</p>
      </footer>
    </MobileFrame>
  )
}
