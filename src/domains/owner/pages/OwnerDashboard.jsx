// src/domains/owner/pages/OwnerDashboard.jsx

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import SodiumBadge from '@/shared/ui/SodiumBadge'
import CertBadge from '@/shared/ui/CertBadge'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { OwnerApi } from '../api/owner.api'
import StoreSearch from './StoreSearch'
import StoreRegistration from './StoreRegistration'
import MenuManager from './MenuManager'
import StoreEdit from './StoreEdit'
import './owner.css'

export default function OwnerDashboard() {
  const { user, logout, refresh } = useAuth()   // ★ refresh 추가
  const navigate = useNavigate()
  const toast = useToast()                       // ★ toast 추가

  const [view, setView] = useState('dashboard')
  const [store, setStore] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claimTarget, setClaimTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const my = await OwnerApi.getMyStore(user.id)
    setStore(my)
    if (my) {
      setStatus(await OwnerApi.getVerificationStatus(my.id))
      setClaimTarget(my)   // ★ null → my (재제출 시 연동 모드 보존)
    } else {
      setStatus(null)
      setClaimTarget(null)
      setView((v) => (v === 'dashboard' ? 'search' : v))
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const locked = status === 'pending' || status === 'rejected'

  const goAction = (target) => {
    if (locked) {
      toast.info(status === 'pending'
        ? '서류 심사가 진행 중입니다. 승인 후 수정할 수 있습니다.'
        : '서류가 반려되었습니다. 재제출하거나 연동을 취소할 수 있습니다.')
      return
    }
    setView(target)
  }

  // ★ 연동 취소 (pending/rejected → owner_id 해제)
  const cancel = async () => {
    if (!store) return
    const msg = status === 'rejected'
      ? '반려된 서류를 다시 제출하지 않고 연동을 완전히 취소할까요?\n\n가게 소유권이 해제되고 손님 모드로 돌아갑니다.'
      : '작성 중인 서류 제출을 포기하고 연동을 취소할까요?\n\n가게 소유권이 해제되고 손님 모드로 돌아갑니다.'
    if (!window.confirm(msg)) return
    try {
      await OwnerApi.cancelClaim(store.id)
      toast.success('연동이 취소되었습니다.')
      await refresh()        // user_type 메모리 갱신
      await load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <MobileFrame><div className="ow-loading">정보를 불러오는 중…</div></MobileFrame>

  if (view === 'search')
    return (
      <StoreSearch
        onBack={() => navigate('/mypage', { replace: true })}   // ★ 마이페이지로 (뒤로가기 갇힘 해소)
        onClaim={(s) => { setClaimTarget(s); setView('registration') }}
        onRegister={() => { setClaimTarget(null); setView('registration') }}
      />
    )

  if (view === 'registration')
    return (
      <StoreRegistration
        initialData={claimTarget}
        onBack={() => setView('dashboard')}
        onDone={() => { setView('dashboard'); load() }}
      />
    )

  // ★ store 가드: store 없으면 edit/menu 렌더 불가 (진동 방지)
  if (view === 'menu' && store)
    return <MenuManager store={store} onBack={() => setView('dashboard')} onSaved={load} />

  if (view === 'edit' && store)
    return (
      <StoreEdit
        store={store}
        onBack={() => setView('dashboard')}
        onChanged={load}
        onDisconnected={async () => {       // ★ 원자 초기화 + refresh
          await refresh()                    // user_type 메모리 갱신 (owner→member 반영)
          setStore(null)
          setStatus(null)
          setClaimTarget(null)
          setView('search')
        }}
      />
    )

  return (
    <MobileFrame>
      <header className="ow-header">
        <h1>사장님 라운지 👔</h1>
        <div className="ow-header-actions">
          <button className="ow-mode" onClick={() => navigate('/')}>손님 모드 🏠</button>
          <button className="ow-logout" onClick={logout}>로그아웃</button>
        </div>
      </header>

      {/* ★ pending 배너: 계속 작성 + 연동 취소 */}
      {status === 'pending' && (
        <div className="ow-banner ow-banner-warn">
          <span>⏳</span>
          <div style={{ flex: 1 }}>
            <strong>서류 심사 대기 중입니다</strong>
            <p>승인 전까지 메뉴·정보 수정이 제한됩니다. (영업일 기준 1~2일)</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Button size="sm" style={{ flex: 1 }} onClick={() => setView('registration')}>📝 계속 작성</Button>
              <Button variant="danger-ghost" size="sm" style={{ flex: 1 }} onClick={cancel}>❌ 연동 취소</Button>
            </div>
          </div>
        </div>
      )}

      {/* ★ rejected 배너: 재제출 + 연동 취소 */}
      {status === 'rejected' && (
        <div className="ow-banner ow-banner-danger">
          <span>🚫</span>
          <div style={{ flex: 1 }}>
            <strong>서류가 반려되었습니다</strong>
            <p>사유를 확인하고 다시 제출하거나, 연동을 취소할 수 있습니다.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Button size="sm" style={{ flex: 1 }} onClick={() => setView('registration')}>🔄 재제출</Button>
              <Button variant="danger-ghost" size="sm" style={{ flex: 1 }} onClick={cancel}>❌ 연동 취소</Button>
            </div>
          </div>
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