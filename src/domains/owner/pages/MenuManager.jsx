import { useState } from 'react'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import SodiumBadge from '@/shared/ui/SodiumBadge'
import { useToast } from '@/shared/ui/ToastProvider'
import { AVOID_TAG_OPTIONS } from '@/shared/constants/region'
import { OwnerApi } from '../api/owner.api'
import './owner.css'

export default function MenuManager({ store, onBack, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    main_menu: store?.main_menu ?? '',
    est_sodium_mg: store?.est_sodium_mg ?? '',
    is_measurable: store?.is_measurable ?? false,
    avoid_tags: store?.avoid_tags ?? [],
  })
  const [busy, setBusy] = useState(false)

  const toggleTag = (t) => setForm((f) => ({ ...f, avoid_tags: f.avoid_tags.includes(t) ? f.avoid_tags.filter((x) => x !== t) : [...f.avoid_tags, t] }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.main_menu.trim()) return toast.error('대표 메뉴 이름을 입력해 주세요.')
    if (form.est_sodium_mg === '') return toast.error('나트륨 함량을 입력해 주세요. (모르면 대략적인 추정치)')
    setBusy(true)
    try {
      await OwnerApi.updateMenu(store.id, {
        main_menu: form.main_menu.trim(),
        est_sodium_mg: parseFloat(form.est_sodium_mg),
        is_measurable: form.is_measurable,
        avoid_tags: form.avoid_tags,
      })
      toast.success('대표 메뉴와 영양 정보가 반영되었습니다.')
      onSaved(); onBack()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <MobileFrame>
      <header className="ow-subheader">
        <button className="ow-back" onClick={onBack} aria-label="뒤로">←</button>
        <h1>메뉴·영양소 관리</h1>
      </header>
      <main className="ow-main">
        <h2 className="ow-greet reveal">가장 자신 있는 건강 메뉴<br />1가지를 소개해 주세요</h2>
        <p className="ow-greet-sub reveal" style={{ '--d': '40ms' }}>나트륨 수치와 뱃지는 건강을 생각하는 손님의 선택에 큰 도움이 됩니다.</p>

        <form onSubmit={save} className="card reveal" style={{ '--d': '80ms', padding: 24 }}>
          <div className="field">
            <label className="label">대표 메뉴 이름 <span className="req">*</span></label>
            <input className="input" value={form.main_menu} onChange={(e) => setForm((f) => ({ ...f, main_menu: e.target.value }))} placeholder="예) 전복 해물 뚝배기" />
          </div>
          <div className="field">
            <label className="label">나트륨 함량 (mg) <span className="req">*</span></label>
            <input className="input" type="number" inputMode="numeric" value={form.est_sodium_mg}
              onChange={(e) => setForm((f) => ({ ...f, est_sodium_mg: e.target.value }))} placeholder="예) 850" />
            <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              입력 미리보기 <SodiumBadge sodium={Number(form.est_sodium_mg)} isMeasurable={form.is_measurable} />
            </p>
          </div>
          <div className="field">
            <label className="ow-switch-row">
              <span>실측 수치입니다 <small>(측정 불가 시 추정치로 표시됩니다)</small></span>
              <span className="switch"><input type="checkbox" checked={form.is_measurable} onChange={(e) => setForm((f) => ({ ...f, is_measurable: e.target.checked }))} /><i /></span>
            </label>
          </div>
          <div className="field">
            <label className="label">주의 식재료 태그</label>
            <div className="ow-tag-grid">
              {AVOID_TAG_OPTIONS.map((t) => (
                <button key={t} type="button" className={`chip ${form.avoid_tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" block disabled={busy}>{busy ? '저장 중…' : '메뉴 정보 저장하기'}</Button>
        </form>
      </main>
    </MobileFrame>
  )
}