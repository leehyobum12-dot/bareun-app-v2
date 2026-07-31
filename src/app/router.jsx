// app/router.jsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/domains/auth/hooks/useAuth';

const Login = lazy(() => import('@/domains/auth/pages/Login'));
const Terms = lazy(() => import('@/domains/auth/pages/Terms'));
const HealthStep1 = lazy(() => import('@/domains/onboarding/pages/HealthStep1'));
const HealthStep2 = lazy(() => import('@/domains/onboarding/pages/HealthStep2'));
const Home = lazy(() => import('@/domains/restaurant/pages/Home'));
const MyPage = lazy(() => import('@/domains/account/pages/MyPage'));
const OwnerDashboard = lazy(() => import('@/domains/owner/pages/OwnerDashboard'));
const AdminDashboard = lazy(() => import('@/domains/admin/pages/AdminDashboard'));

const Loader = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '60dvh' }}>
    <div style={{ width: 38, height: 38, border: '3.5px solid var(--brand-100)', borderTopColor: 'var(--brand-600)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

/** 인증 가드 — 세션이 없으면 로그인으로 */
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** 역할 가드 — 프론트는 UX 방어선일 뿐, 진짜 권한은 RLS가 지킵니다 */
function RequireRole({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (user?.userType !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<Loader />}><Login /></Suspense> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/terms', element: <Suspense fallback={<Loader />}><Terms /></Suspense> },
      { path: '/health/step1', element: <Suspense fallback={<Loader />}><HealthStep1 /></Suspense> },
      { path: '/health/step2', element: <Suspense fallback={<Loader />}><HealthStep2 /></Suspense> },
      { path: '/', element: <Suspense fallback={<Loader />}><Home /></Suspense> },
      { path: '/mypage', element: <Suspense fallback={<Loader />}><MyPage /></Suspense> },
      {
        element: <RequireRole role="owner" />,
        children: [{ path: '/owner', element: <Suspense fallback={<Loader />}><OwnerDashboard /></Suspense> }],
      },
      {
        element: <RequireRole role="admin" />,
        children: [{ path: '/admin', element: <Suspense fallback={<Loader />}><AdminDashboard /></Suspense> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() { return <RouterProvider router={router} />; }