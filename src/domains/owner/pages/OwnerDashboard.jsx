import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import SodiumBadge from '@/shared/ui/SodiumBadge'
import CertBadge from '@/shared/ui/CertBadge'
import { useAuth } from '@/domains/auth/providers/AuthProvider'
import { OwnerApi } from '../api/owner.api'
import StoreSearch from './StoreSearch'
import StoreRegistration from './StoreRegistration'
import MenuManager from './MenuManager'
import StoreEdit from './StoreEdit'
import './owner.css'

export default function OwnerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('dashboard')
  const [store, setStore] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claimTarget, setClaimTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const my = await OwnerApi.getMyStore(user.id)
    setStore(my)
    if (my) { setStatus(await OwnerApi.getVerificationStatus(my.id)); setClaimTarget(null) }
    else { setStatus(null); setView((v) => (v === 'dashboard' ? 'search' : v)) }
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const locked = status === 'pending' || status === 'rejected'
  const goAction = (target) => {
    if (locked) {
      alert(status === 'pending' ? '🔒 서류 심사가 진행 중입니다.\n승인 후 수정할 수 있습니다.' : '🔒 서류가 반려되었습니다.\n서류를 다시 제출해 주세요.')
      return
    }
    setView(target)
  }

  if (loading) return <MobileFrame><div className="ow-loading">정보를 불러오는 중…</div></MobileFrame>

  if (view === 'search')
    return <StoreSearch onBack={() => setView('dashboard')}
      onClaim={(s) => { setClaimTarget(s); setView('registration') }}
      onRegister={() => { setClaimTarget(null); setView('registration') }} />
  if (view === 'registration')
    return <StoreRegistration initialData={claimTarget} onBack={() => setView('dashboard')}
      onDone={() => { setView('dashboard'); load() }} />
  if (view === 'menu')
    return <MenuManager store={store} onBack={() => setView('dashboard')} onSaved={load} />
  if (view === 'edit')
    return <StoreEdit store={store} onBack={() => setView('dashboard')} onChanged={load}
      onDisconnected={() => { setView('dashboard'); load() }} />

  return (
    <MobileFrame>
      <header className="ow-header">
        <h1>사장님 라운지 👔</h1>
        <div className="ow-header-actions">
          <button className="ow-mode" onClick={() => navigate('/')}>손님 모드 🏠</button>
          <button className="ow-logout" onClick={logout}>로그아웃</button>
        </div>
      </header>

      {status === 'pending' && (
        <div className="ow-banner ow-banner-warn">
          <span>⏳</span>
          <div><strong>서류 심사 대기 중입니다</strong>
            <p>승인 전까지 메뉴·정보 수정이 제한됩니다. (영업일 기준 1~2일)</p></div>
        </div>
      )}
      {status === 'rejected' && (
        <div className="ow-banner ow-banner-danger">
          <span>🚫</span>
          <div><strong>서류가 반려되었습니다</strong>
            <p>사유를 확인하고 서류를 다시 제출해 주세요.</p>
            <Button variant="danger-ghost" size="sm" onClick={() => setView('registration')}>🔄 서류 재제출</Button></div>
        </div>
      )}

      <main className="ow-main">
        <section className="reveal">
          <h2 className="ow-greet">오늘도 건강한 한 끼를<br />준비해주셔서 감사합니다, <strong>{user?.name ?? '사장'}님!</strong></h2>
          <p className="ow-greet-sub">손님들에게 우리 가게가 이렇게 보여요.</p>
        </section>

        {store && (
          <article className="card card-hover r-card reveal" style={{ '--d': '60ms' }}>
            <div className="r-card-top">
              <div className="r-card-emoji">🍲</div>
              <div className="r-card-body">
                <div className="r-card-name-row"><h3>{store.store_name}</h3><span className="r-card-dist">🚶 {store.si ?? '제주시'}</span></div>
                <p className="r-card-addr">📍 {store.road_name || `${store.si} ${store.emd}`}</p>
                <p className="r-card-menu">{store.main_menu || '대표 메뉴를 등록해 주세요.'}</p>
              </div>
            </div>
            <div className="r-card-badges">
              <div className="r-card-badges-left">
                <SodiumBadge sodium={store.est_sodium_mg} isMeasurable={store.is_measurable} />
                {(store.certs ?? '').split(',').map((c) => c.trim()).filter(Boolean).map((c) => <CertBadge key={c} cert={c} />)}
              </div>
              <span className="r-card-biz">{store.biz_type}</span>
            </div>
          </article>
        )}

        <section className="ow-actions reveal" style={{ '--d': '120ms' }}>
          <button className={`ow-action ${locked ? 'locked' : ''}`} onClick={() => goAction('menu')}>
            <span>{locked ? '🔒' : '🍲'}</span>메뉴·영양소 관리
          </button>
          <button className={`ow-action ow-action-light ${locked ? 'locked' : ''}`} onClick={() => goAction('edit')}>
            <span>{locked ? '🔒' : '🏪'}</span>가게 정보 수정
          </button>
        </section>
      </main>
    </MobileFrame>
  )
}