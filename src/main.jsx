// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)

// 개발환경에서는 서비스워커를 등록하지 않습니다 (에러 디버깅 핵심)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'))
}