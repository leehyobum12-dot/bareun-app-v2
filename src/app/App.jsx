// src/app/App.jsx
import { AuthProvider } from '@/domains/auth'
import { ToastProvider } from '@/app/providers/ToastProvider'
import  QueryProvider  from '@/app/providers/QueryProvider'
import ErrorBoundary from '@/shared/ui/ErrorBoundary'
import AppRouter from './router'
import '@/shared/ui/tokens.css'
import '@/shared/ui/components.css'

export default function App() {
  return (
    <QueryProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </QueryProvider>
  )
}