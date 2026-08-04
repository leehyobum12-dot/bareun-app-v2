// src/app/providers/QueryProvider.jsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// [v3.2] queryClient를 export하여 외부에서 접근 가능하게 함
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5분간 캐시 유효
      retry: 2,                    // 네트워크 오류 시 2회 재시도
      refetchOnWindowFocus: false, // 탭 전환 시 자동 리페치 비활성 (모바일 PWA 적합)
    },
  },
})

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}