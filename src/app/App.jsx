// src/app/App.jsx
import { AuthProvider } from '@/domains/auth'
import { ToastProvider } from '@/app/providers/ToastProvider'
import QueryProvider from '@/app/providers/QueryProvider'
import ErrorBoundary from '@/shared/ui/ErrorBoundary'
import AppRouter from './router'
import '@/shared/ui/tokens.css'
import '@/shared/ui/components.css'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryProvider>
    </ErrorBoundary>
  )
}