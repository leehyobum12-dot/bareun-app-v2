import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const [stages, setStages] = useState(user?.healthProfile?.stages ?? {})
  const [busy, setBusy] = useState(false)

  const select = (d, v) => setStages((p) => ({ ...p, [d]: v }))

  const handleComplete = async () => {
    setBusy(true)
    try {
      await OnboardingApi.saveHealthProfile(user.id, { diseases, stages })
      await refresh(); toast.success('건강 프로필이 완성되었습니다.'); navigate('/', { replace: true })
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <MobileFrame>
      <div className="ob-page">
        <div className="ob-progress reveal">
          <div className="ob-progress-track"><i style={{ width: '100%' }} /></div>
          <span>2 / 2</span>
        </div>
        <h1 className="ob-title reveal">조금 더 자세히<br />알려주세요 📋</h1>
        <p className="ob-sub reveal" style={{ '--d': '40ms' }}>선택하신 질환의 현재 단계를 알려주세요.</p>

        {targets.map((d, i) => {
          const q = STAGE_QUESTIONS[d]
          return (
            <section key={d} className="card reveal" style={{ '--d': `${80 + i * 60}ms`, padding: 20, marginBottom: 16 }}>
              <h2 className="ob-stage-title">{q.title}</h2>
              <p className="ob-stage-sub">{q.subtitle}</p>
              <div className="ob-stage-list">
                {q.options.map((opt) => (
                  <button key={opt.id} type="button" className={`ob-stage-opt ${stages[d] === opt.id ? 'on' : ''}`}
                    onClick={() => select(d, opt.id)}>
                    <span className="ob-stage-ic">{opt.icon}</span>
                    <span><b>{opt.label}</b><small>{opt.desc}</small></span>
                  </button>
                ))}
                <button type="button" className={`ob-stage-opt ${stages[d] === 'unknown' ? 'on' : ''}`}
                  onClick={() => select(d, 'unknown')}>
                  <span className="ob-stage-ic">🤔</span>
                  <span><b>잘 모르겠어요</b><small>추후에 다시 설정할 수 있어요</small></span>
                </button>
              </div>
            </section>
          )
        })}

        <Button size="lg" block disabled={busy} onClick={handleComplete} style={{ marginTop: 8 }}>
          {busy ? '저장 중…' : '완료하기'}
        </Button>
      </div>
    </MobileFrame>
  )
}