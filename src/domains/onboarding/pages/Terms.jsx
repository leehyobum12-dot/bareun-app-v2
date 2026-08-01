import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import Button from '@/shared/ui/Button'
import { useAuth } from '@/domains/auth'
import { useToast } from '@/app/providers/ToastProvider'
import { OnboardingApi } from '../api/onboarding.api'
import './onboarding.css'

const CONSENTS = [
  { key: 'terms', label: '서비스 이용약관 동의', url: 'https://beaded-aunt-cf4.notion.site/3a9f7c49537680de991feab579b9f46c' },
  { key: 'location', label: '위치기반서비스 이용약관 동의', url: 'https://beaded-aunt-cf4.notion.site/3a9f7c49537680798c21c33f5162d9a3' },
  { key: 'privacy', label: '민감정보(건강정보) 수집 동의', url: 'https://app.notion.com/p/3a8f7c4953768059a409ce14d13ae4ea' },
  { key: 'disclaimer', label: '건강 필터링 면책 조항 동의', url: 'https://beaded-aunt-cf4.notion.site/3abf7c49537680f7b293f2a76c8aed74' },
]

export default function Terms() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState({ terms: false, location: false, privacy: false, disclaimer: false })
  const [busy, setBusy] = useState(false)
  const allAgreed = Object.values(agreed).every(Boolean)

  const toggle = (key) => setAgreed((p) => ({ ...p, [key]: !p[key] }))
  const toggleAll = () => { const v = !allAgreed; setAgreed({ terms: v, location: v, privacy: v, disclaimer: v }) }

  const handleAgree = async () => {
    setBusy(true)
    try {
      await OnboardingApi.saveTermsAgreement(user.id)
      await refresh()
      toast.success('동의가 완료되었습니다.')
      navigate('/health/step1')
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <MobileFrame>
      <div className="ob-page">
        <p className="ob-eyebrow reveal">바른인증식당</p>
        <h1 className="ob-title reveal">서비스 이용을 위해<br />약관에 동의해 주세요</h1>

        <div className="ob-disclaimer reveal" style={{ '--d': '60ms' }}>
          <strong>⚠️ 건강 필터링 서비스 면책 고지</strong>
          <p>본 서비스의 나트륨·식재료 정보는 <b>공공데이터 추정치</b>이며 실제 조리법에 따라 오차가 있을 수 있습니다.
            중증 질환이나 치명적 알레르기가 있으신 경우 취식 전 반드시 식당에 직접 확인해 주세요.</p>
        </div>

        <div className="card reveal" style={{ '--d': '100ms', padding: 20 }}>
          <label className="consent-all">
            <input type="checkbox" checked={allAgreed} onChange={toggleAll} />
            <span>필수 약관에 <b>모두 동의</b>합니다</span>
          </label>
          <div className="consent-list">
            {CONSENTS.map((c) => (
              <div key={c.key} className="consent-row">
                <label className="consent-check">
                  <input type="checkbox" checked={agreed[c.key]} onChange={() => toggle(c.key)} />
                  <span>[필수] {c.label}</span>
                </label>
                <a href={c.url} target="_blank" rel="noreferrer" className="consent-link">보기</a>
              </div>
            ))}
          </div>
        </div>

        <Button size="lg" block disabled={!allAgreed || busy} onClick={handleAgree}
          className="reveal" style={{ '--d': '140ms', marginTop: 24 }}>
          {busy ? '저장 중…' : '동의하고 계속하기'}
        </Button>
      </div>
    </MobileFrame>
  )
}