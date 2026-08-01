// src/domains/owner/pages/StoreRegistration.jsx

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { BIZ_TYPE } from '@/shared/constants/region'
import { validateImageFile } from '@/core/security/validators'
import { OwnerApi } from '../api/owner.api'
import { DAYS_OF_WEEK, CERT_OPTIONS } from '../constants'
import { storeRegistrationSchema } from '../schemas/storeSchemas'
import './owner.css'

export default function StoreRegistration({ initialData, onBack, onDone }) {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const postcodeRef = useRef(null)
  const [showAddr, setShowAddr] = useState(false)
  const [busy, setBusy] = useState(false)

  // [F-3] 모드·저장 대상 마운트 시 1회 캡처
  const [initial] = useState(() => initialData)
  const isClaim = !!initial

  /*
   * [React Hook Form + Zod] 하이브리드
   * - 텍스트 필드: register + Zod 검증
   * - 파일·주소·토글: setValue / useState (비정형 입력)
   */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(storeRegistrationSchema),
    defaultValues: {
      store_name: initialData?.store_name ?? '',
      biz_type: initialData?.biz_type ?? '한식',
      phone: initialData?.phone ?? '',
      road_name: initialData?.road_name ?? '',
      lot_num: initialData?.lot_num ?? '',
      si: initialData?.si ?? '',
      emd: initialData?.emd ?? '',
      lat: initialData?.lat ?? null,
      lng: initialData?.lng ?? null,
      business_days: initialData?.business_days ?? [],
      open_time: initialData?.open_time?.substring(0, 5) ?? '',
      close_time: initialData?.close_time?.substring(0, 5) ?? '',
      closed_days: initialData?.closed_days ?? '',
      certs: initialData?.certs ? initialData.certs.split(',').filter(Boolean) : [],
      biz_reg_number: '',
    },
    mode: 'onBlur',
  })

  const businessDays = watch('business_days') ?? []
  const certs = watch('certs') ?? []
  const roadName = watch('road_name')
  const lotNum = watch('lot_num')

  // [F-4] 파일 상태 (RHF 부적합 — useState 유지)
  const [bizFile, setBizFile] = useState(null)
  const [bizPreview, setBizPreview] = useState('')
  const [certFiles, setCertFiles] = useState({})

  const certInputId = (cert) => `cert-${String(cert).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}`

  useEffect(() => () => {
    if (bizPreview) URL.revokeObjectURL(bizPreview)
    Object.values(certFiles).forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
  }, [bizPreview, certFiles])

  const toggleDay = (d) => {
    const next = businessDays.includes(d)
      ? businessDays.filter((x) => x !== d)
      : [...businessDays, d]
    setValue('business_days', next)
  }

  const toggleCert = (c) => {
    const next = certs.includes(c)
      ? certs.filter((x) => x !== c)
      : [...certs, c]
    setValue('certs', next)
  }

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

  // [F-2] 주소 검색 → setValue로 RHF 상태 업데이트
  const openPostcode = () => {
    setShowAddr(true)
    const load = () => {
      if (postcodeRef.current) postcodeRef.current.innerHTML = ''
      new window.daum.Postcode({
        oncomplete: (data) => {
          setValue('road_name', data.roadAddress, { shouldValidate: true })
          setValue('lot_num', data.jibunAddress)
          setValue('si', data.sido)
          setValue('emd', data.bname)

          if (window.naver?.maps?.Service) {
            window.naver.maps.Service.geocode(
              { query: data.roadAddress },
              (status, response) => {
                if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                  const item = response.v2.addresses[0]
                  setValue('lat', parseFloat(item.y))
                  setValue('lng', parseFloat(item.x))
                }
                setShowAddr(false)
              }
            )
          } else {
            setShowAddr(false)
          }
        },
        width: '100%',
        height: '100%',
      }).embed(postcodeRef.current)
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

  const onSubmit = async (data) => {
    // 파일 검증 (RHF 외부)
    if (!bizFile) return toast.error('사업자등록증 사진을 첨부해 주세요.')

    setBusy(true)
    try {
      const payload = {
        owner_id: user.id,
        store_name: data.store_name,
        biz_type: data.biz_type,
        phone: data.phone || null,
        road_name: data.road_name,
        lot_num: data.lot_num,
        si: data.si,
        emd: data.emd,
        lat: data.lat,
        lng: data.lng,
        business_days: data.business_days,
        open_time: data.open_time ? `${data.open_time}:00` : null,
        close_time: data.close_time ? `${data.close_time}:00` : null,
        closed_days: data.closed_days,
        certs: data.certs.length ? data.certs.join(',') : null,
        biz_reg_number: data.biz_reg_number,
        // [F-1] is_verified 의도적 제외
      }
      const certPayload = {}
      for (const c of data.certs) if (certFiles[c]) certPayload[c] = certFiles[c].file

      await OwnerApi.submitRegistration({
        userId: user.id,
        storePayload: payload,
        bizRegFile: bizFile,
        certFiles: certPayload,
        initialStoreId: isClaim ? initial.id : null,
      })
      toast.success(isClaim ? '서류가 다시 접수되었습니다.' : '신규 가게 등록이 접수되었습니다. (영업일 1~2일 내 승인)')
      onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
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
          <p className="ow-greet-sub reveal" style={{ '--d': '40ms' }}>
            안전한 서비스 운영을 위해 <b>사업자 및 공공 인증 서류</b>가 필요합니다.
          </p>

          {isClaim && (
            <div className="ow-banner ow-banner-info reveal" style={{ '--d': '60ms' }}>
              <span>🔒</span>
              <div><strong>공공데이터 정보 보호 중</strong>
                <p>소유권 확인을 위해 최초 연동 시 상호명·주소는 수정할 수 없습니다. 승인 후 [가게 정보 수정]에서 변경하세요.</p></div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="card reveal" style={{ '--d': '80ms', padding: 24 }}>
            <h3 className="ow-section">🔐 사업자 신원 인증</h3>
            <div className="field">
              <label className="label">사업자등록번호 <span className="req">*</span></label>
              <input className="input" placeholder="예) 123-45-67890" maxLength={12}
                {...register('biz_reg_number')} />
              {errors.biz_reg_number && <p className="field-error">{errors.biz_reg_number.message}</p>}
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
                <label key={c} className={`ow-cert ${certs.includes(c) ? 'on' : ''}`}>
                  <input type="checkbox" checked={certs.includes(c)} onChange={() => toggleCert(c)} />{c}
                </label>
              ))}
            </div>
            {certs.map((c) => (
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
              <input className="input" readOnly={isClaim}
                style={isClaim ? { background: 'var(--surface-warm)', color: 'var(--ink-300)' } : undefined}
                {...register('store_name')} />
              {errors.store_name && <p className="field-error">{errors.store_name.message}</p>}
            </div>
            <div className="field">
              <label className="label">업종 <span className="req">*</span></label>
              <select className="select" {...register('biz_type')}>
                {BIZ_TYPE.filter((t) => t !== '전체').map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.biz_type && <p className="field-error">{errors.biz_type.message}</p>}
            </div>
            <div className="field">
              <label className="label">연락처</label>
              <input className="input" type="tel" placeholder="예) 064-123-4567"
                {...register('phone')} />
              {errors.phone && <p className="field-error">{errors.phone.message}</p>}
            </div>
            <div className="field">
              <label className="label">가게 주소 <span className="req">*</span></label>
              {!isClaim && <Button type="button" variant="ghost" size="sm" onClick={openPostcode} style={{ marginBottom: 10 }}>🔎 주소 검색</Button>}
              {roadName && (
                <div className="ow-addrbox"><p>📍 {roadName} <span>(지번: {lotNum})</span></p></div>
              )}
              {errors.road_name && <p className="field-error">{errors.road_name.message}</p>}
            </div>

            <hr className="ow-hr" />
            <h3 className="ow-section">⏰ 운영 정보</h3>
            <div className="field">
              <label className="label">영업일</label>
              <div className="ow-day-grid">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d} type="button" className={`ow-day ${businessDays.includes(d) ? 'on' : ''}`} onClick={() => toggleDay(d)}>{d}</button>
                ))}
              </div>
            </div>
            <div className="ow-time-grid">
              <div className="field"><label className="label">오픈</label><input className="input" type="time" {...register('open_time')} /></div>
              <div className="field"><label className="label">마감</label><input className="input" type="time" {...register('close_time')} /></div>
            </div>
            <div className="field">
              <label className="label">휴무일 안내</label>
              <input className="input" placeholder="예) 매주 월요일, 명절 연휴"
                {...register('closed_days')} />
              {errors.closed_days && <p className="field-error">{errors.closed_days.message}</p>}
            </div>

            <Button type="submit" size="lg" block disabled={busy} style={{ marginTop: 8 }}>
              {busy ? '제출 중…' : isClaim ? '서류 제출하기' : '가게 등록 신청하기'}
            </Button>
          </form>
        </main>
      </MobileFrame>

      {/* [F-2] 주소 검색 모달 */}
      <div className={`ow-addrmodal ${showAddr ? 'open' : ''}`} aria-hidden={!showAddr} onClick={() => setShowAddr(false)}>
        <div className="ow-addrmodal-card" role="dialog" aria-modal="true" aria-label="도로명 주소 검색" onClick={(e) => e.stopPropagation()}>
          <div className="ow-addrmodal-head">
            <strong>도로명 주소 검색</strong>
            <button className="ow-addrmodal-close" onClick={() => setShowAddr(false)} aria-label="닫기">✕</button>
          </div>
          <div ref={postcodeRef} className="ow-addrmodal-body" />
        </div>
      </div>
    </>
  )
}