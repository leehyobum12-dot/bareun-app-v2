// src/domains/owner/pages/StoreEdit.jsx

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useToast } from '@/app/providers/ToastProvider'
import { OwnerApi } from '../api/owner.api'
import { storeEditSchema } from '../schemas/storeSchemas'
import AddressSearchModal from '../components/AddressSearchModal' // [추가] 공용 주소 모달
import { useAutoFormat } from '@/core/hooks/useAutoFormat'
import './owner.css'

const parseTime = (t) => (t ? t.substring(0, 5) : '')

export default function StoreEdit({ store, onBack, onChanged, onDisconnected }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [showAddrModal, setShowAddrModal] = useState(false) // [추가] 주소 모달 상태

  /*
   * [React Hook Form + Zod]
   * - resolver: Zod 스키마로 검증
   * - defaultValues: store에서 초기값
   * - mode: 'onBlur' → 필드 이탈 시 검증 (모바일 키보드 UX 적합)
   */
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(storeEditSchema),
    defaultValues: {
      // [기존] 운영 정보
      phone: store?.phone ?? '',
      open_time: parseTime(store?.open_time),
      close_time: parseTime(store?.close_time),
      closed_days: store?.closed_days ?? '',
      // [추가] 주소 정보
      road_name: store?.road_name ?? '',
      lot_num: store?.lot_num ?? '',
      si: store?.si ?? '',
      emd: store?.emd ?? '',
      lat: store?.lat ?? null,
      lng: store?.lng ?? null,
    },
    mode: 'onBlur',
  })

    // [추가] useAutoFormat 훅 사용
  const { handlePhone } = useAutoFormat(setValue)

  // [추가] 주소 표시용 watch
  const roadName = watch('road_name')
  const lotNum = watch('lot_num')
  const lat = watch('lat')
  const lng = watch('lng')

  /**
   * [추가] 주소 검색 완료 핸들러
   * AddressSearchModal에서 반환된 데이터를 RHF 상태에 주입
   */
  const handleAddressComplete = (addressData) => {
    setValue('road_name', addressData.road_name, { shouldValidate: true })
    setValue('lot_num', addressData.lot_num, { shouldValidate: true })
    setValue('si', addressData.si, { shouldValidate: true })
    setValue('emd', addressData.emd, { shouldValidate: true })
    setValue('lat', addressData.lat, { shouldValidate: true })
    setValue('lng', addressData.lng, { shouldValidate: true })

    if (addressData.lat && addressData.lng) {
      toast.success('주소와 좌표가 자동으로 입력되었습니다.')
    } else {
      toast.error('좌표 변환에 실패했습니다. 다른 주소로 다시 시도해 주세요.')
    }
  }

  const onSubmit = async (data) => {
    // [추가] 주소 변경 시 좌표 필수 검증
    if (!data.lat || !data.lng) {
      toast.error('주소를 정확히 입력해 주세요. 주소 검색 버튼을 사용하세요.')
      return
    }

    setBusy(true)
    try {
      await OwnerApi.updateStoreInfo(store.id, {
        // [기존] 운영 정보
        phone: data.phone,
        open_time: data.open_time ? `${data.open_time}:00` : null,
        close_time: data.close_time ? `${data.close_time}:00` : null,
        closed_days: data.closed_days,
        // [추가] 주소 정보
        road_name: data.road_name,
        lot_num: data.lot_num,
        si: data.si,
        emd: data.emd,
        lat: data.lat,
        lng: data.lng,
      })
      toast.success('가게 정보가 수정되었습니다.')
      onChanged()
      onBack()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
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
          <h1>가게 정보 수정</h1>
        </header>
        <main className="ow-main">
          <h2 className="ow-greet reveal">손님들이 헛걸음하지 않도록<br />정확한 정보를 알려주세요</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="card reveal" style={{ '--d': '60ms', padding: 24, marginTop: 20 }}>

            {/* ─────────────────────────────────────────────
                [추가] 주소 섹션 (운영 정보보다 위에 배치 - 더 중요)
                ───────────────────────────────────────────── */}
            <h3 className="ow-section">📍 가게 주소</h3>

            {/* 읽기 전용 필드 (is_verified = true이므로 수정 불가) */}
            <div className="field">
              <label className="label">가게 이름</label>
              <input
                className="input"
                value={store?.store_name ?? ''}
                readOnly
                style={{ background: 'var(--surface-warm)', color: 'var(--ink-300)' }}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 4 }}>
                * 상호명은 승인 후 변경할 수 없습니다
              </p>
            </div>

            <div className="field">
              <label className="label">주소 검색 <span className="req">*</span></label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddrModal(true)}
                style={{ marginBottom: 10 }}
              >
                🔎 주소 검색하기
              </Button>

              {roadName && (
                <div className="ow-addrbox">
                  <p>📍 <strong>도로명:</strong> {roadName}</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                    지번: {lotNum || '(없음)'}
                  </p>
                  {lat && lng && (
                    <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 4 }}>
                      🛰️ 좌표: {lat.toFixed(6)}, {lng.toFixed(6)}
                    </p>
                  )}
                </div>
              )}

              {/* 숨겨진 필드들 (서버 전송용) */}
              <input type="hidden" {...register('si')} />
              <input type="hidden" {...register('emd')} />
              <input type="hidden" {...register('road_name')} />
              <input type="hidden" {...register('lot_num')} />
              <input type="hidden" {...register('lat')} />
              <input type="hidden" {...register('lng')} />

              {errors.road_name && (
                <p className="field-error">{errors.road_name.message}</p>
              )}
            </div>

            <hr className="ow-hr" />

            {/* ─────────────────────────────────────────────
                [기존] 운영 정보 섹션 (그대로 유지)
                ───────────────────────────────────────────── */}
            <h3 className="ow-section">⏰ 운영 정보</h3>
            <div className="field">
              <label className="label">가게 연락처</label>
              <input
                className="input"
                type="tel"
                placeholder="예) 064-123-4567"
                {...register('phone')}
                onChange={(e) => {
                  register('phone').onChange(e)
                  handlePhone(e)
                }}
              />
              {errors.phone && <p className="field-error">{errors.phone.message}</p>}
            </div>
            <div className="ow-time-grid">
              <div className="field">
                <label className="label">오픈</label>
                <input className="input" type="time" {...register('open_time')} />
              </div>
              <div className="field">
                <label className="label">마감</label>
                <input className="input" type="time" {...register('close_time')} />
              </div>
            </div>
            <div className="field">
              <label className="label">휴무일 안내</label>
              <input className="input" placeholder="예) 매주 월요일"
                {...register('closed_days')} />
              {errors.closed_days && <p className="field-error">{errors.closed_days.message}</p>}
            </div>
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? '저장 중…' : '정보 저장하기'}
            </Button>
          </form>

          {/* ─────────────────────────────────────────────
              [기존] Danger Zone (그대로 유지)
              ───────────────────────────────────────────── */}
          <div className="ow-danger reveal" style={{ '--d': '120ms' }}>
            <h3>위험 구역 (Danger Zone)</h3>
            <Button variant="ghost" block onClick={() => disconnect('unlink')} disabled={busy}>
              🔗 가게 관리 연동 해제 (가게 양도)
            </Button>
            <Button variant="danger-ghost" block onClick={() => disconnect('close')} disabled={busy} style={{ marginTop: 10 }}>
              🚨 식당 폐업 신고하기 (영구 숨김)
            </Button>
            <p>* 연동 해제 시 다른 사장님이 이 가게를 다시 등록할 수 있습니다.<br />* 폐업 시 가게가 지도에서 완전히 사라집니다.</p>
          </div>
        </main>
      </MobileFrame>

      {/* [추가] 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={showAddrModal}
        onClose={() => setShowAddrModal(false)}
        onComplete={handleAddressComplete}
      />
    </>
  )
}