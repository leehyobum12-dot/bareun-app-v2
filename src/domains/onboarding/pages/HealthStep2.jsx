// src/domains/onboarding/pages/HealthStep2.jsx

import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { STAGE_QUESTIONS } from '../constants'
import { OnboardingApi } from '../api/onboarding.api'
import './onboarding.css'

export default function HealthStep2() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const diseases = location.state?.diseases ?? user?.healthProfile?.diseases ?? []
  const targets = diseases.filter((d) => STAGE_QUESTIONS[d])
  const [stages, setStages] = useState(user?.healthProfile?.stages ?? {}) // hook
  const [busy, setBusy] = useState(false)                                 // hook

  /*
   * [C-4 수정] step1을 거치지 않은 직접 접근 방어
   *
   * 조건 1: diseases가 빈 배열 → step1 미경유
   * 조건 2: targets가 빈 배열 → 단계 질문이 없는 질환만 있음
   *          (이 경우 step1에서 바로 저장되어야 정상)
   *
   * 두 경우 모두 /health/step1으로 리디렉트
   */
  if (diseases.length === 0 || targets.length === 0) {
    return <Navigate to="/health/step1" replace />
  }

  const select = (d, v) => setStages((p) => ({ ...p, [d]: v }))

  const handleComplete = async () => {
    setBusy(true)
    try {
      await OnboardingApi.saveHealthProfile(user.id, { diseases, stages })
      await refresh()
      toast.success('건강 프로필이 완성되었습니다.')
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileFrame>
      <div className="onboarding">
        <div className="onboarding-progress">2 / 2</div>
        <h1 className="onboarding-title">
          조금 더 자세히 <br />
          알려주세요 📋
        </h1>
        <p className="onboarding-sub">
          선택하신 질환의 현재 단계를 알려주세요.
        </p>

        {targets.map((d, i) => {
          const q = STAGE_QUESTIONS[d]
          return (
            <div className="stage-card" key={d}>
              <h2 className="stage-title">{q.title}</h2>
              {q.subtitle && <p className="stage-sub">{q.subtitle}</p>}
              <div className="stage-options">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={`stage-opt ${stages[d] === opt.id ? 'on' : ''}`}
                    onClick={() => select(d, opt.id)}
                  >
                    <span className="stage-opt-icon">{opt.icon}</span>
                    <strong>{opt.label}</strong>
                    {opt.desc && <span className="stage-opt-desc">{opt.desc}</span>}
                  </button>
                ))}
                <button
                  className={`stage-opt unknown ${stages[d] === 'unknown' ? 'on' : ''}`}
                  onClick={() => select(d, 'unknown')}
                >
                  🤔 <strong>잘 모르겠어요</strong>
                  <span className="stage-opt-desc">추후에 다시 설정할 수 있어요</span>
                </button>
              </div>
            </div>
          )
        })}

        <Button
          className="btn-primary btn-lg"
          disabled={busy}
          onClick={handleComplete}
        >
          {busy ? '저장 중…' : '완료하기'}
        </Button>
      </div>
    </MobileFrame>
  )
}