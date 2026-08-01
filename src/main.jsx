// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from '@/core/lib/sentry'
import App from './app/App'

// [Phase 5] Sentry 초기화 — React 렌더링 전에 실행
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)