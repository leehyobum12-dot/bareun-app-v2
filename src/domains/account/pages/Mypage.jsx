import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { DISEASE_CATEGORIES } from '@/domains/onboarding/constants'
import { AccountApi } from '../api/account.api'
import './account.css'

const STAGE_LABEL = { stage1: '1단계', stage2: '2단계', grade1: '1등급', grade2: '2등급' }

export default function MyPage() {
  const { user, logout, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isOwner = user?.userType === 'owner'

  const providerBadge = (p) => {
    if (p === 'kakao') return <span className="mp-provider mp-kakao">💬 카카오 계정 연동</span>
    if (p === 'google') return <span className="mp-provider mp-google">🇬 구글 계정 연동</span>
    return <span className="mp-provider">📧 이메일 계정</span>
  }

  const upgrade = async () => {
    if (!window.confirm('가게를 등록하고 사장님 모드로 전환할까요?\n(언제든 손님 모드로 돌아올 수 있습니다)')) return
    try { await AccountApi.upgradeToOwner(user.id); await refresh(); toast.success('사장님 모드로 전환되었습니다.') }
    catch { toast.error('전환 중 오류가 발생했습니다.') }
  }

  const withdraw = async () => {
    const msg = isOwner
      ? '정말 탈퇴하시겠습니까?\n사장님으로 등록하신 모든 서류가 파기되고 가게 소유권이 초기화됩니다.'
      : '정말 탈퇴하시겠습니까?\n저장된 건강 필터와 프로필이 영구 삭제됩니다.'
    if (!window.confirm(msg)) return
    try {
      await AccountApi.withdraw(user)
      await logout()
      toast.success('회원탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.')
      navigate('/login', { replace: true })
    } catch (e) { toast.error(`탈퇴 처리 중 문제가 발생했습니다: ${e.message}`) }
  }

  return (
    <MobileFrame>
      <div className="mp-topbar">
        <button className="ow-back" onClick={() => navigate('/')} aria-label="뒤로">←</button>
        <strong>마이페이지</strong>
      </div>

      <section className="mp-profile reveal">
        <div className="mp-cover" />
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
          <button className="mp-cta" onClick={upgrade}>
            <span>🏪 가게 등록하고 사장님 되기</span><span>→</span>
          </button>
        )}
      </section>

      <section className="mp-menu reveal" style={{ '--d': '140ms' }}>
        {[
          { icon: '🔔', title: '알림 설정', desc: '식당 업데이트 알림' },
          { icon: '💗', title: '찜한 식당', desc: '저장한 식당 목록 보기' },
          { icon: '💬', title: '이용 문의', desc: '불편사항 및 개선 요청' },
        ].map((m) => (
          <div key={m.title} className="mp-menu-row">
            <span className="mp-menu-ic">{m.icon}</span>
            <div><strong>{m.title}</strong><small>{m.desc}</small></div>
            <span className="mp-menu-chev">›</span>
          </div>
        ))}
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