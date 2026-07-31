import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileFrame from '@/shared/ui/MobileFrame'
import { useToast } from '@/shared/ui/ToastProvider'
import { useAuth } from '../providers/AuthProvider'
import { AuthApi } from '../api/auth.api'
import './Login.css'

export default function Login() {
  const { user, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  const handleOAuth = async (provider) => {
    try { await AuthApi.signInWithOAuth(provider) }
    catch { toast.error('로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
  }

  return (
    <MobileFrame>
      <div className="login">
        <div className="login-hero">
          <div className="login-bowl" aria-hidden>
            <span className="steam s1" /><span className="steam s2" /><span className="steam s3" />
            🍲
          </div>
          <h1 className="login-title">짜지 않아서<br /><em>더 맛있는</em> 한 끼</h1>
          <p className="login-sub">
            혈압·당뇨·신장 건강이 걱정되시나요?<br />
            나트륨을 걸러서, 믿을 수 있는 인증 식당만 추천해 드려요.
          </p>
        </div>

        <div className="login-actions">
          <button className="oauth oauth-kakao reveal" style={{ '--d': '80ms' }} onClick={() => handleOAuth('kakao')}>
            <span className="oauth-ic">💬</span> 카카오로 시작하기
          </button>
          <button className="oauth oauth-google reveal" style={{ '--d': '140ms' }} onClick={() => handleOAuth('google')}>
            <span className="oauth-ic">🇬</span> 구글로 시작하기
          </button>
        </div>

        <p className="login-terms reveal" style={{ '--d': '200ms' }}>
          로그인 시 바른인증식당의 <a href="https://beaded-aunt-cf4.notion.site/3a9f7c49537680de991feab579b9f46c" target="_blank" rel="noreferrer">이용약관</a> 및{' '}
          <a href="https://app.notion.com/p/3a8f7c4953768059a409ce14d13ae4ea" target="_blank" rel="noreferrer">개인정보처리방침</a>에<br />동의하는 것으로 간주합니다.
        </p>

        <div className="login-trust reveal" style={{ '--d': '260ms' }}>
          <span>🩺</span> 공공데이터 기반 영양 정보 · 의료 진단을 대신하지 않습니다
        </div>
      </div>
    </MobileFrame>
  )
}