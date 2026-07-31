// src/app/App.jsx
import { AuthProvider } from '@/domains/auth/providers/AuthProvider'
import { ToastProvider } from '@/shared/ui/ToastProvider'
import ErrorBoundary from '@/shared/ui/ErrorBoundary'
import AppRouter from './router'
import '@/shared/ui/tokens.css'
import '@/shared/ui/components.css'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}