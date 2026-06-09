import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './ProtectedRoute'

// Lazy-load every page so heavy deps (recharts, plaid-link) only ship when needed.
const LoginPage            = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage         = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage   = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage    = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const VerifyEmailPage      = lazy(() => import('./pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })))
const VerifyEmailChangePage = lazy(() => import('./pages/auth/VerifyEmailChangePage').then(m => ({ default: m.VerifyEmailChangePage })))
const DashboardPage        = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const TransactionsPage     = lazy(() => import('./pages/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const BudgetsPage          = lazy(() => import('./pages/budgets/BudgetsPage').then(m => ({ default: m.BudgetsPage })))
const GoalsPage            = lazy(() => import('./pages/goals/GoalsPage').then(m => ({ default: m.GoalsPage })))
const AccountsPage         = lazy(() => import('./pages/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })))
const SettingsPage         = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const HouseholdPage        = lazy(() => import('./pages/household/HouseholdPage').then(m => ({ default: m.HouseholdPage })))
const AcceptInvitePage     = lazy(() => import('./pages/household/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20" role="status" aria-label="Loading">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const s = (node: React.ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>

export const router = createBrowserRouter([
  { path: '/login',           element: s(<LoginPage />) },
  { path: '/register',        element: s(<RegisterPage />) },
  { path: '/forgot-password', element: s(<ForgotPasswordPage />) },
  { path: '/reset-password',  element: s(<ResetPasswordPage />) },
  { path: '/verify-email',    element: s(<VerifyEmailPage />) },
  { path: '/verify-email-change', element: s(<VerifyEmailChangePage />) },
  { path: '/household/accept',    element: s(<AcceptInvitePage />) },
  {
    path: '/check-email',
    element: (
      <div className="flex items-center justify-center h-screen bg-[#F6F5F8]">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-text-1 mb-2">Check your email</h2>
          <p className="text-[13px] text-text-2">We sent a verification link to your email. Click it to activate your account.</p>
          <a href="/login" className="btn btn-primary w-full mt-6 btn-lg">Back to login</a>
        </div>
      </div>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/',             element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard',    element: s(<DashboardPage />) },
      { path: '/transactions', element: s(<TransactionsPage />) },
      { path: '/budgets',      element: s(<BudgetsPage />) },
      { path: '/goals',        element: s(<GoalsPage />) },
      { path: '/accounts',     element: s(<AccountsPage />) },
      { path: '/household',    element: s(<HouseholdPage />) },
      { path: '/settings',     element: s(<SettingsPage />) },
    ],
  },
])
