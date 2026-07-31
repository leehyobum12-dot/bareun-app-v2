// src/shared/ui/ErrorBoundary.jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info.componentStack) }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="frame" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 32 }}>
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🍲</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', marginBottom: 10 }}>
            화면을 불러오는 중<br />문제가 생겼어요
          </h1>
          <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)', marginBottom: 28 }}>
            일시적인 오류일 수 있습니다.<br />아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            새로고침 하기 🔄
          </button>
        </div>
      </div>
    )
  }
}