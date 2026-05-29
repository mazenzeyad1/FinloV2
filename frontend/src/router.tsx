import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage }        from './pages/auth/LoginPage'
import { RegisterPage }     from './pages/auth/RegisterPage'
import { DashboardPage }    from './pages/dashboard/DashboardPage'
import { TransactionsPage } from './pages/transactions/TransactionsPage'
import { BudgetsPage }      from './pages/budgets/BudgetsPage'
import { GoalsPage }        from './pages/goals/GoalsPage'
import { AccountsPage }     from './pages/accounts/AccountsPage'

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
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
      { path: '/dashboard',    element: <DashboardPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/budgets',      element: <BudgetsPage /> },
      { path: '/goals',        element: <GoalsPage /> },
      { path: '/accounts',     element: <AccountsPage /> },
    ],
  },
])
