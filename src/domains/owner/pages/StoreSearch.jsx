import { useState } from 'react'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import { useToast } from '@/shared/ui/ToastProvider'
import { OwnerApi } from '../api/owner.api'
import './owner.css'

export default function StoreSearch({ onBack, onClaim, onRegister }) {
  const toast = useToast()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)

  const search = async (e) => {
    e.preventDefault()
    if (!term.trim()) return toast.info('가게 이름을 입력해 주세요.')
    setBusy(true); setSearched(true)
    try { setResults(await OwnerApi.searchPublicStores(term.trim())) }
    catch { toast.error('검색 중 오류가 발생했습니다.') }
    finally { setBusy(false) }
  }

  const claim = async (s) => {
    if (!window.confirm(`[${s.store_name}] 가게를 내 식당으로 연동할까요?\n\n안전한 소유권 확인을 위해 서류 제출 화면으로 이동합니다.`)) return
    try { await OwnerApi.claimStore(s.id); toast.success('가게가 연동되었습니다. 서류를 제출해 주세요.'); onClaim(s) }
    catch (e) { toast.error(e.message) }
  }

  return (
    <MobileFrame>
      <header className="ow-subheader">
        <button className="ow-back" onClick={onBack} aria-label="뒤로">←</button>
        <h1>우리 가게 찾기 🔍</h1>
      </header>
      <main className="ow-main">
        <h2 className="ow-greet reveal">공공데이터에 등록된<br />우리 가게를 찾아보세요</h2>
        <p className="ow-greet-sub reveal" style={{ '--d': '40ms' }}>이미 등록되어 있으면 주소 입력 없이 연동할 수 있어요.</p>

        <form className="ow-search reveal" style={{ '--d': '80ms' }} onSubmit={search}>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="예) 바른식당" aria-label="가게 검색" />
          <Button type="submit" disabled={busy}>{busy ? '검색 중' : '검색'}</Button>
        </form>

        {searched && results.length === 0 && (
          <EmptyState icon="🔍" title="검색 결과가 없어요" description="우리 가게가 아직 등록되어 있지 않아요."
            actionLabel="신규 가게 직접 등록" onAction={onRegister} />
        )}

        {results.map((s, i) => (
          <article key={s.id} className="card r-card reveal" style={{ '--d': `${i * 40}ms` }}>
            <div className="r-card-top">
              <div className="r-card-emoji">🍲</div>
              <div className="r-card-body">
                <div className="r-card-name-row"><h3>{s.store_name}</h3><span className="r-card-biz">{s.biz_type}</span></div>
                <p className="r-card-addr">📍 {s.road_name || `${s.si} ${s.emd}`}</p>
              </div>
            </div>
            <Button block onClick={() => claim(s)} style={{ marginTop: 14 }}>내 가게로 연동하기</Button>
          </article>
        ))}

        {searched && results.length > 0 && (
          <div className="reveal" style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ color: 'var(--ink-300)', fontSize: 'var(--text-sm)', marginBottom: 12 }}>찾으시는 가게가 없나요?</p>
            <Button variant="ghost" block onClick={onRegister}>신규 가게 직접 등록하기</Button>
          </div>
        )}
      </main>
    </MobileFrame>
  )
}