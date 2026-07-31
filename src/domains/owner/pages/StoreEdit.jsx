import { useState } from 'react'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/ToastProvider'
import { isPhone } from '@/core/security/validators'
import { OwnerApi } from '../api/owner.api'
import './owner.css'

const parseTime = (t) => (t ? t.substring(0, 5) : '')

export default function StoreEdit({ store, onBack, onChanged, onDisconnected }) {
  const toast = useToast()
  const [form, setForm] = useState({
    phone: store?.phone ?? '',
    open_time: parseTime(store?.open_time),
    close_time: parseTime(store?.close_time),
    closed_days: store?.closed_days ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (!isPhone(form.phone)) return toast.error('연락처 형식이 올바르지 않습니다.')
    setBusy(true)
    try {
      await OwnerApi.updateStoreInfo(store.id, {
        phone: form.phone,
        open_time: form.open_time ? `${form.open_time}:00` : null,
        close_time: form.close_time ? `${form.close_time}:00` : null,
        closed_days: form.closed_days,
      })
      toast.success('가게 운영 정보가 수정되었습니다.')
      onChanged(); onBack()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const disconnect = async (action) => {
    const msg = action === 'unlink'
      ? '⚠️ 가게 관리 연동을 해제할까요?\n\n가게는 손님 앱에 계속 노출되지만 더 이상 관리할 수 없으며 손님 모드로 전환됩니다.'
      : '⚠️ 정말 폐업 신고를 하실 건가요?\n\n손님 앱 지도와 검색에서 영구적으로 숨김 처리됩니다.'
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await OwnerApi.disconnectStore(store.id, action)
      toast.success(action === 'unlink' ? '가게 연동이 해제되었습니다.' : '폐업 처리가 완료되었습니다. 그동안 고생 많으셨습니다.')
      onDisconnected()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <MobileFrame>
      <header className="ow-subheader">
        <button className="ow-back" onClick={onBack} aria-label="뒤로">←</button>
        <h1>가게 정보 수정</h1>
      </header>
      <main className="ow-main">
        <h2 className="ow-greet reveal">손님들이 헛걸음하지 않도록<br />정확한 운영 정보를 알려주세요</h2>

        <form onSubmit={save} className="card reveal" style={{ '--d': '60ms', padding: 24, marginTop: 20 }}>
          <div className="field"><label className="label">가게 연락처</label>
            <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="예) 064-123-4567" /></div>
          <div className="ow-time-grid">
            <div className="field"><label className="label">오픈</label><input className="input" type="time" value={form.open_time} onChange={set('open_time')} /></div>
            <div className="field"><label className="label">마감</label><input className="input" type="time" value={form.close_time} onChange={set('close_time')} /></div>
          </div>
          <div className="field"><label className="label">휴무일 안내</label>
            <input className="input" value={form.closed_days} onChange={set('closed_days')} placeholder="예) 매주 월요일" /></div>
          <Button type="submit" size="lg" block disabled={busy}>{busy ? '저장 중…' : '운영 정보 저장하기'}</Button>
        </form>

        <div className="ow-danger reveal" style={{ '--d': '120ms' }}>
          <h3>위험 구역 (Danger Zone)</h3>
          <Button variant="ghost" block onClick={() => disconnect('unlink')} disabled={busy}>🔗 가게 관리 연동 해제 (가게 양도)</Button>
          <Button variant="danger-ghost" block onClick={() => disconnect('close')} disabled={busy} style={{ marginTop: 10 }}>🚨 식당 폐업 신고하기 (영구 숨김)</Button>
          <p>* 연동 해제 시 다른 사장님이 이 가게를 다시 등록할 수 있습니다.<br />* 폐업 시 가게가 지도에서 완전히 사라집니다.</p>
        </div>
      </main>
    </MobileFrame>
  )
}