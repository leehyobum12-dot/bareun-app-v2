import { useState, useRef, useEffect } from 'react'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { BIZ_TYPE } from '@/shared/constants/region'
import { isPhone, isBizNumber, sanitizeText } from '@/core/security/validators'
import { OwnerApi } from '../api/owner.api'
import { DAYS_OF_WEEK, CERT_OPTIONS } from '../constants'
import { validateImageFile } from '@/core/security/validators'
import './owner.css'

export default function StoreRegistration({ initialData, onBack, onDone }) {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const postcodeRef = useRef(null)
  const [showAddr, setShowAddr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    store_name: initialData?.store_name ?? '',
    biz_type: initialData?.biz_type ?? '한식',
    phone: initialData?.phone ?? '',
    road_name: initialData?.road_name ?? '',
    lot_num: initialData?.lot_num ?? '',
    si: initialData?.si ?? '', emd: initialData?.emd ?? '',
    lat: initialData?.lat ?? null, lng: initialData?.lng ?? null,
    business_days: initialData?.business_days ?? [],
    open_time: initialData?.open_time?.substring(0, 5) ?? '',
    close_time: initialData?.close_time?.substring(0, 5) ?? '',
    closed_days: initialData?.closed_days ?? '',
    certs: initialData?.certs ? initialData.certs.split(',').filter(Boolean) : [],
    biz_reg_number: '',
  })
  const [bizFile, setBizFile] = useState(null)
  const [bizPreview, setBizPreview] = useState('')
  const [certFiles, setCertFiles] = useState({})

  const certInputId = (cert) => `cert-${String(cert).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}`

  // 변경 후 — 마운트 시 한 번만 캡처
  const [initial] = useState(() => initialData)
  const isClaim = !!initial

  useEffect(() => () => {
    if (bizPreview) URL.revokeObjectURL(bizPreview)
    Object.values(certFiles).forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
  }, [bizPreview, certFiles])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleDay = (d) => setForm((f) => ({ ...f, business_days: f.business_days.includes(d) ? f.business_days.filter((x) => x !== d) : [...f.business_days, d] }))
  const toggleCert = (c) => setForm((f) => ({ ...f, certs: f.certs.includes(c) ? f.certs.filter((x) => x !== c) : [...f.certs, c] }))

  const onBizFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const err = validateImageFile(f)
    if (err) return toast.error(err)
    setBizFile(f)
    setBizPreview(URL.createObjectURL(f))
  }
  const onCertFile = (cert, e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const err = validateImageFile(f)
    if (err) return toast.error(err)
    setCertFiles((p) => ({ ...p, [cert]: { file: f, preview: URL.createObjectURL(f) } }))
  }

  const openPostcode = () => {
    setShowAddr(true)

    const load = () => {
      if (postcodeRef.current) postcodeRef.current.innerHTML = ''

      new window.daum.Postcode({
        oncomplete: (data) => {
          const base = {
            road_name: data.roadAddress,
            lot_num: data.jibunAddress,
            si: data.sido,
            emd: data.bname,
          }

          // [O-3] 네이버 geocode로 좌표 획득 (index.html에 네이버 지도 API 로드 전제)
          if (window.naver?.maps?.Service) {
            window.naver.maps.Service.geocode(
              { query: data.roadAddress },
              (status, response) => {
                if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                  const item = response.v2.addresses[0]
                  setForm((f) => ({ ...f, ...base, lat: parseFloat(item.y), lng: parseFloat(item.x) }))
                } else {
                  setForm((f) => ({ ...f, ...base }))
                }
                setShowAddr(false)
              }
            )
          } else {
            setForm((f) => ({ ...f, ...base }))
            setShowAddr(false)
          }
        },
        width: '100%',
        height: '100%',
      }).embed(postcodeRef.current)   // ← .open() 아님. DOM 임베드
    }

    if (window.daum?.Postcode) { load(); return }

    const scriptSrc = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    const existing = document.querySelector(`script[src="${scriptSrc}"]`)
    if (existing) { existing.addEventListener('load', load, { once: true }); return }
    const s = document.createElement('script')
    s.src = scriptSrc
    s.onload = load
    document.body.appendChild(s)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.store_name.trim() || !form.road_name) return toast.error('가게 이름과 주소는 필수입니다.')
    if (!isBizNumber(form.biz_reg_number)) return toast.error('사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)')
    if (!bizFile) return toast.error('사업자등록증 사진을 첨부해 주세요.')
    if (!isPhone(form.phone)) return toast.error('연락처 형식이 올바르지 않습니다.')

    setBusy(true)
    try {
      const payload = {
        owner_id: user.id,
        store_name: sanitizeText(form.store_name, 40),
        biz_type: form.biz_type, phone: form.phone || null,
        road_name: form.road_name, lot_num: form.lot_num, si: form.si, emd: form.emd,
        lat: form.lat, lng: form.lng,
        business_days: form.business_days,
        open_time: form.open_time ? `${form.open_time}:00` : null,
        close_time: form.close_time ? `${form.close_time}:00` : null,
        closed_days: form.closed_days,
        certs: form.certs.length ? form.certs.join(',') : null,
        biz_reg_number: form.biz_reg_number,
      }
      const certPayload = {}
      for (const c of form.certs) if (certFiles[c]) certPayload[c] = certFiles[c].file

      await OwnerApi.submitRegistration({
        userId: user.id, storePayload: payload, bizRegFile: bizFile, certFiles: certPayload,
        initialStoreId: isClaim ? initial.id : null,
      })
      toast.success(isClaim ? '서류가 다시 접수되었습니다.' : '신규 가게 등록이 접수되었습니다. (영업일 1~2일 내 승인)')
      onDone()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <MobileFrame>
        <header className="ow-subheader">
          <button className="ow-back" onClick={onBack} aria-label="뒤로">←</button>
          <h1>{isClaim ? '서류 제출 및 가게 연동' : '신규 가게 등록'}</h1>
        </header>

        <main className="ow-main">
          <h2 className="ow-greet reveal">{isClaim ? '마지막 단계입니다!' : '환영합니다, 사장님! 🎉'}</h2>
          <p className="ow-greet-sub reveal" style={{ '--d': '40ms' }}>안전한 서비스 운영을 위해 <b>사업자 및 공공 인증 서류</b>가 필요합니다.</p>

          {isClaim && (
            <div className="ow-banner ow-banner-info reveal" style={{ '--d': '60ms' }}>
              <span>🔒</span>
              <div><strong>공공데이터 정보 보호 중</strong>
                <p>소유권 확인을 위해 최초 연동 시 상호명·주소는 수정할 수 없습니다. 승인 후 [가게 정보 수정]에서 변경하세요.</p></div>
            </div>
          )}

          <form onSubmit={submit} className="card reveal" style={{ '--d': '80ms', padding: 24 }}>
            <h3 className="ow-section">🔐 사업자 신원 인증</h3>
            <div className="field">
              <label className="label">사업자등록번호 <span className="req">*</span></label>
              <input className="input" value={form.biz_reg_number} onChange={set('biz_reg_number')} placeholder="예) 123-45-67890" maxLength={12} />
            </div>
            <div className="field">
              <label className="label">사업자등록증 사진 <span className="req">*</span></label>
              <input type="file" accept="image/*" ref={fileRef} onChange={onBizFile} style={{ display: 'none' }} />
              <button type="button" className="ow-filebox" onClick={() => fileRef.current.click()}>
                <span>📸</span>{bizFile ? '다른 사진으로 변경하기' : '터치하여 앨범에서 선택'}
              </button>
              {bizPreview && <img src={bizPreview} alt="사업자등록증 미리보기" className="ow-preview" />}
            </div>

            <hr className="ow-hr" />
            <h3 className="ow-section">🏆 공공 인증 마크 <small>(선택)</small></h3>
            <div className="ow-cert-grid">
              {CERT_OPTIONS.map((c) => (
                <label key={c} className={`ow-cert ${form.certs.includes(c) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.certs.includes(c)} onChange={() => toggleCert(c)} />{c}
                </label>
              ))}
            </div>
            {form.certs.map((c) => (
              <div key={c} className="field" style={{ marginTop: 12 }}>
                <label className="label">{c} 증명서 사진</label>
                <input type="file" accept="image/*" onChange={(e) => onCertFile(c, e)} style={{ display: 'none' }} id={certInputId(c)} />
                <button type="button" className="ow-filebox" onClick={() => document.getElementById(certInputId(c))?.click()}>
                  <span>📎</span>{certFiles[c] ? '파일 선택 완료 ✓' : `${c} 증명서 첨부`}
                </button>
                {certFiles[c]?.preview && <img src={certFiles[c].preview} alt={`${c} 미리보기`} className="ow-preview" style={{ height: 80, objectFit: 'cover' }} />}
              </div>
            ))}

            <hr className="ow-hr" />
            <h3 className="ow-section">📍 가게 기본 정보</h3>
            <div className="field">
              <label className="label">가게 이름 <span className="req">*</span></label>
              <input className="input" value={form.store_name} onChange={set('store_name')} readOnly={isClaim}
                style={isClaim ? { background: 'var(--surface-warm)', color: 'var(--ink-300)' } : undefined} />
            </div>
            <div className="field">
              <label className="label">업종 <span className="req">*</span></label>
              <select className="select" value={form.biz_type} onChange={set('biz_type')}>
                {BIZ_TYPE.filter((t) => t !== '전체').map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">연락처</label>
              <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="예) 064-123-4567" />
            </div>
            <div className="field">
              <label className="label">가게 주소 <span className="req">*</span></label>
              {!isClaim && <Button type="button" variant="ghost" size="sm" onClick={openPostcode} style={{ marginBottom: 10 }}>🔎 주소 검색</Button>}
              {form.road_name && (
                <div className="ow-addrbox"><p>📍 {form.road_name} <span>(지번: {form.lot_num})</span></p></div>
              )}
            </div>

            <hr className="ow-hr" />
            <h3 className="ow-section">⏰ 운영 정보</h3>
            <div className="field">
              <label className="label">영업일</label>
              <div className="ow-day-grid">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d} type="button" className={`ow-day ${form.business_days.includes(d) ? 'on' : ''}`} onClick={() => toggleDay(d)}>{d}</button>
                ))}
              </div>
            </div>
            <div className="ow-time-grid">
              <div className="field"><label className="label">오픈</label><input className="input" type="time" value={form.open_time} onChange={set('open_time')} /></div>
              <div className="field"><label className="label">마감</label><input className="input" type="time" value={form.close_time} onChange={set('close_time')} /></div>
            </div>
            <div className="field">
              <label className="label">휴무일 안내</label>
              <input className="input" value={form.closed_days} onChange={set('closed_days')} placeholder="예) 매주 월요일, 명절 연휴" />
            </div>

            <Button type="submit" size="lg" block disabled={busy} style={{ marginTop: 8 }}>
              {busy ? '제출 중…' : isClaim ? '서류 제출하기' : '가게 등록 신청하기'}
            </Button>
          </form>
        </main>
      </MobileFrame>
      {/* ★ 주소 검색 모달 — 항상 렌더, .open 으로 여닫기 */}
      <div
        className={`ow-addrmodal ${showAddr ? 'open' : ''}`}
        aria-hidden={!showAddr}
        onClick={() => setShowAddr(false)}
      >
        <div
          className="ow-addrmodal-card"
          role="dialog"
          aria-modal="true"
          aria-label="도로명 주소 검색"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ow-addrmodal-head">
            <strong>도로명 주소 검색</strong>
            <button
              className="ow-addrmodal-close"
              onClick={() => setShowAddr(false)}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div ref={postcodeRef} className="ow-addrmodal-body" />
        </div>
      </div>
    </>
  )
}