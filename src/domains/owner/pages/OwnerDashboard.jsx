// src/domains/owner/pages/OwnerDashboard.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [view, setView] = useState('dashboard')
  const [claimTarget, setClaimTarget] = useState(null)

  /*
   * [TanStack Query] 내 가게 조회
   * - 5분 캐시 (staleTime)
   * - 네트워크 오류 시 2회 재시도 (retry)
   * - invalidateQueries로 선택적 갱신
   */
  const { data: store = null, isLoading: storeLoading } = useQuery({
    queryKey: ['owner', 'my-store', user.id],
    queryFn: () => OwnerApi.getMyStore(user.id),
  })

  /*
   * [TanStack Query] 심사 상태 조회 (가게가 있을 때만)
   * - enabled: !!store → store 없으면 쿼리 자체를 안 날림
   */
  const { data: status = null } = useQuery({
    queryKey: ['owner', 'verification-status', store?.id],
    queryFn: () => OwnerApi.getVerificationStatus(store.id),
    enabled: !!store,
  })

  /*
   * [F-5] store 변화 시 claimTarget 동기화
   * - store 존재 → claimTarget = store (재제출 시 연동 모드 보존)
   * - store 없음 → claimTarget = null + search로 이동
   */
  useEffect(() => {
    if (storeLoading) return
    if (store) {
      setClaimTarget(store)
    } else {
      setClaimTarget(null)
      setView((v) => (v === 'dashboard' ? 'search' : v))
    }
  }, [storeLoading, store])

  const locked = status === 'pending' || status === 'rejected'

  // [F-7] alert → toast
  const goAction = (target) => {
    if (locked) {
      toast.info(status === 'pending'
        ? '서류 심사가 진행 중입니다. 승인 후 수정할 수 있습니다.'
        : '서류가 반려되었습니다. 재제출하거나 연동을 취소할 수 있습니다.')
      return
    }
    setView(target)
  }

  // [F-7] 연동 취소 (pending/rejected → owner_id 해제)
  const cancel = async () => {
    if (!store) return
    const msg = status === 'rejected'
      ? '반려된 서류를 다시 제출하지 않고 연동을 완전히 취소할까요?\n\n가게 소유권이 해제되고 손님 모드로 돌아갑니다.'
      : '작성 중인 서류 제출을 포기하고 연동을 취소할까요?\n\n가게 소유권이 해제되고 손님 모드로 돌아갑니다.'
    if (!window.confirm(msg)) return
    try {
      await OwnerApi.cancelClaim(store.id)
      toast.success('연동이 취소되었습니다.')
      await refresh()   // user_type 메모리 갱신
      invalidateOwner()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // [TanStack Query] owner 데이터 무효화 헬퍼
  const invalidateOwner = () => {
    queryClient.invalidateQueries({ queryKey: ['owner', 'my-store', user.id] })
    queryClient.invalidateQueries({ queryKey: ['owner', 'verification-status'] })
  }

  if (storeLoading) return <MobileFrame><div className="ow-loading">정보를 불러오는 중…</div></MobileFrame>

  // [F-9] search ← 마이페이지로 (뒤로가기 갇힘 해소)
  if (view === 'search')
    return (
      <StoreSearch
        onBack={() => navigate('/mypage', { replace: true })}
        onClaim={(s) => { setClaimTarget(s); setView('registration') }}
        onRegister={() => { setClaimTarget(null); setView('registration') }}
      />
    )

  if (view === 'registration')
    return (
      <StoreRegistration
        initialData={claimTarget}
        onBack={() => setView('dashboard')}
        onDone={() => { setView('dashboard'); invalidateOwner() }}
      />
    )

  // [F-8] store 가드
  if (view === 'menu' && store)
    return <MenuManager store={store} onBack={() => setView('dashboard')} onSaved={invalidateOwner} />

  // [F-8] store 가드 + [F-6] onDisconnected 원자 초기화 + refresh
  if (view === 'edit' && store)
    return (
      <StoreEdit
        store={store}
        onBack={() => setView('dashboard')}
        onChanged={invalidateOwner}
        onDisconnected={async () => {
          await refresh()        // user_type 메모리 갱신 (owner→member)
          invalidateOwner()      // TanStack Query 캐시 무효화
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

      {/* [F-7] pending 배너: 계속 작성 + 연동 취소 */}
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

      {/* [F-7] rejected 배너: 재제출 + 연동 취소 */}
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