import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useAuth } from '@/domains/auth/providers/AuthProvider'
import { useToast } from '@/shared/ui/ToastProvider'
import { DISEASE_CATEGORIES, DISEASES_WITH_STAGES } from '../constants'
import { OnboardingApi } from '../api/onboarding.api'
import './onboarding.css'

export default function HealthStep1() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(user?.healthProfile?.diseases ?? [])
  const [busy, setBusy] = useState(false)

  const toggle = (d) => setSelected((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))

  const handleNext = async () => {
    setBusy(true)
    try {
      if (selected.length === 0) {
        await OnboardingApi.saveHealthProfile(user.id, { diseases: [], stages: {} })
        await refresh(); navigate('/'); return
      }
      if (selected.some((d) => DISEASES_WITH_STAGES.includes(d))) {
        navigate('/health/step2', { state: { diseases: selected } })
      } else {
        await OnboardingApi.saveHealthProfile(user.id, { diseases: selected, stages: {} })
        await refresh(); toast.success('건강 프로필이 저장되었습니다.'); navigate('/')
      }
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <MobileFrame>
      <div className="ob-page">
        <div className="ob-progress reveal">
          <div className="ob-progress-track"><i style={{ width: '50%' }} /></div>
          <span>1 / 2</span>
        </div>
        <h1 className="ob-title reveal">건강 상태를<br />알려주세요 🩺</h1>
        <p className="ob-sub reveal" style={{ '--d': '40ms' }}>해당하는 질환을 모두 선택해 주세요.<br />식당을 걸러드릴 때 사용합니다.</p>

        {DISEASE_CATEGORIES.map((cat, ci) => (
          <section key={cat.id} className="reveal" style={{ '--d': `${80 + ci * 60}ms`, marginBottom: 24 }}>
            <h2 className="ob-cat-name">
              <span className="ob-cat-ic" style={{ background: cat.bg, color: cat.color }}>{cat.icon}</span>
              {cat.name}
            </h2>
            <div className="ob-disease-grid">
              {cat.diseases.map((d) => {
                const on = selected.includes(d)
                return (
                  <button key={d} type="button" className={`ob-disease ${on ? 'on' : ''}`}
                    style={on ? { borderColor: cat.color, background: cat.bg, color: cat.color } : undefined}
                    onClick={() => toggle(d)}>
                    {on && <span className="ob-disease-check">✓</span>}{d}
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <Button size="lg" block disabled={busy} onClick={handleNext} style={{ marginTop: 8 }}>
          {busy ? '저장 중…' : selected.length ? '다음 단계' : '건너뛰기'}
        </Button>
      </div>
    </MobileFrame>
  )
}