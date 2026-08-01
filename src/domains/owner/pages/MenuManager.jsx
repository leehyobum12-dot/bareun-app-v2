// src/domains/owner/pages/MenuManager.jsx

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import SodiumBadge from '@/shared/ui/SodiumBadge'
import { useToast } from '@/app/providers/ToastProvider'
import { AVOID_TAG_OPTIONS } from '@/shared/constants/region'
import { OwnerApi } from '../api/owner.api'
import { menuSchema } from '../schemas/storeSchemas'
import './owner.css'

export default function MenuManager({ store, onBack, onSaved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  /*
   * [React Hook Form + Zod]
   * - watch: 나트륨 미리보기 + 실측 토글 실시간 반영
   * - setValue: avoid_tags 배열 토글 (register로 안 되는 비정형 입력)
   */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      main_menu: store?.main_menu ?? '',
      est_sodium_mg: store?.est_sodium_mg?.toString() ?? '',
      is_measurable: store?.is_measurable ?? false,
      avoid_tags: store?.avoid_tags ?? [],
    },
    mode: 'onBlur',
  })

  const sodiumValue = watch('est_sodium_mg')
  const isMeasurable = watch('is_measurable')
  const avoidTags = watch('avoid_tags') ?? []

  const toggleTag = (t) => {
    const next = avoidTags.includes(t)
      ? avoidTags.filter((x) => x !== t)
      : [...avoidTags, t]
    setValue('avoid_tags', next, { shouldValidate: true })
  }

  const onSubmit = async (data) => {
    setBusy(true)
    try {
      await OwnerApi.updateMenu(store.id, {
        main_menu: data.main_menu.trim(),
        est_sodium_mg: parseFloat(data.est_sodium_mg),
        is_measurable: data.is_measurable,
        avoid_tags: data.avoid_tags,
      })
      toast.success('대표 메뉴와 영양 정보가 반영되었습니다.')
      onSaved()
      onBack()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileFrame>
      <header className="ow-subheader">
        <button className="ow-back" onClick={onBack} aria-label="뒤로">←</button>
        <h1>메뉴·영양소 관리</h1>
      </header>
      <main className="ow-main">
        <h2 className="ow-greet reveal">가장 자신 있는 건강 메뉴<br />1가지를 소개해 주세요</h2>
        <p className="ow-greet-sub reveal" style={{ '--d': '40ms' }}>
          나트륨 수치와 뱃지는 건강을 생각하는 손님의 선택에 큰 도움이 됩니다.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="card reveal" style={{ '--d': '80ms', padding: 24 }}>
          <div className="field">
            <label className="label">대표 메뉴 이름 <span className="req">*</span></label>
            <input className="input" placeholder="예) 전복 해물 뚝배기"
              {...register('main_menu')} />
            {errors.main_menu && <p className="field-error">{errors.main_menu.message}</p>}
          </div>

          <div className="field">
            <label className="label">나트륨 함량 (mg) <span className="req">*</span></label>
            <input className="input" type="number" inputMode="numeric" placeholder="예) 850"
              {...register('est_sodium_mg')} />
            {errors.est_sodium_mg && <p className="field-error">{errors.est_sodium_mg.message}</p>}
            <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              입력 미리보기 <SodiumBadge sodium={Number(sodiumValue)} isMeasurable={isMeasurable} />
            </p>
          </div>

          <div className="field">
            <label className="ow-switch-row">
              <span>실측 수치입니다 <small>(측정 불가 시 추정치로 표시됩니다)</small></span>
              <span className="switch">
                <input type="checkbox" {...register('is_measurable')} />
                <i />
              </span>
            </label>
          </div>

          <div className="field">
            <label className="label">주의 식재료 태그</label>
            <div className="ow-tag-grid">
              {AVOID_TAG_OPTIONS.map((t) => (
                <button key={t} type="button"
                  className={`chip ${avoidTags.includes(t) ? 'on' : ''}`}
                  onClick={() => toggleTag(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? '저장 중…' : '메뉴 정보 저장하기'}
          </Button>
        </form>
      </main>
    </MobileFrame>
  )
}