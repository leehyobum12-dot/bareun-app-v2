// src/app/router.jsx

import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import { useAuth } from '@/domains/auth'

/* ── Lazy Pages ── */
const Login = lazy(() => import('@/domains/auth/pages/Login'))
const Terms = lazy(() => import('@/domains/onboarding/pages/Terms'))
const HealthStep1 = lazy(() => import('@/domains/onboarding/pages/HealthStep1'))
const HealthStep2 = lazy(() => import('@/domains/onboarding/pages/HealthStep2'))
const Home = lazy(() => import('@/domains/restaurant/pages/Home'))
const MyPage = lazy(() => import('@/domains/account/pages/MyPage'))
const OwnerDashboard = lazy(() => import('@/domains/owner/pages/OwnerDashboard'))
const AdminDashboard = lazy(() => import('@/domains/admin/pages/AdminDashboard'))

/* ── 공통 UI ── */
const Loader = () => <div className="loader"><div className="spinner" /></div>

/**
 * [R-2 개선] Suspense 래핑 헬퍼
 * 반복 코드를 제거하고 일관된 fallback 보장
 */
const page = (Component) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
)
/**
 * [신규] 역할별 자동 landing
 * - admin → /admin (심사 화면)
 * - 그 외 → Home
 *
 * [우회] admin이 손님 홈을 봐야 할 때: /?guest=1
 * (AdminDashboard의 '손님 모드' 버튼이 이 경로를 사용)
 */
function Landing() {
  const { user, loading } = useAuth()
  const { search } = useLocation()
  if (loading) return <Loader />

  const forceGuest = new URLSearchParams(search).get('guest') === '1'
  if (user?.userType === 'admin' && !forceGuest) {
    return <Navigate to="/admin" replace />
  }
  return page(Home)
}

/* ──────────────────────────────────────────────
   Guard 0: 비로그인 전용 (로그인 페이지용)
   [R-1 수정] 이미 로그인한 사용자는 / 로 리디렉트
   ────────────────────────────────────────────── */
function RequireGuest() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (user) {
    const target = user.onboardingCompleted ? '/' : '/terms'
    return <Navigate to={target} replace />
  }
  return <Outlet />
}

/* ──────────────────────────────────────────────
   Guard 1: 로그인 확인
   ────────────────────────────────────────────── */
function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/* ──────────────────────────────────────────────
   Guard 2: 온보딩 미완료 전용
   ────────────────────────────────────────────── */
function RequireOnboarding() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (user?.onboardingCompleted) return <Navigate to="/" replace />
  return <Outlet />
}

/* ──────────────────────────────────────────────
   Guard 3: 온보딩 완료 전용
   ────────────────────────────────────────────── */
function RequireOnboarded() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user?.onboardingCompleted) return <Navigate to="/terms" replace />
  return <Outlet />
}

/* ──────────────────────────────────────────────
   Guard 4: 역할 기반 접근 제어 (계층형)
   ────────────────────────────────────────────── */
const ROLE_HIERARCHY = {
  admin: ['admin', 'owner', 'member'],
  owner: ['owner', 'member'],
  member: ['member'],
}

function RequireRole({ role }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />

  const allowed = ROLE_HIERARCHY[user?.userType] ?? []
  if (!allowed.includes(role)) return <Navigate to="/" replace />

  return <Outlet />
}

/* ──────────────────────────────────────────────
   Router 정의
   ────────────────────────────────────────────── */
const router = createBrowserRouter([

  /* ── 공개 라우트 (비로그인 전용) ── */
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: page(Login) },
    ],
  },

  /* ── 인증 필요 라우트 ── */
  {
    element: <RequireAuth />,
    children: [

      /* 온보딩 미완료 전용 */
      {
        element: <RequireOnboarding />,
        children: [
          { path: '/terms', element: page(Terms) },
          { path: '/health/step1', element: page(HealthStep1) },
          { path: '/health/step2', element: page(HealthStep2) },
        ],
      },

      /* 온보딩 완료 전용 */
      {
        element: <RequireOnboarded />,
        children: [
          { path: '/', element: <Landing /> },
          { path: '/mypage', element: page(MyPage) },

          /*
           * [수정] /owner는 온보딩 완료 사용자 모두 접근 가능
           * - member: 가게 찾기/등록 (사장님 되기 진입점)
           * - owner:  사장님 라운지
           * 데이터 보호는 RLS가 담당
           */
          { path: '/owner', element: page(OwnerDashboard) },

          /* admin 전용 (유지) */
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: '/admin', element: page(AdminDashboard) },
            ],
          },
        ],
      },
    ],
  },

  /* Fallback */
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}