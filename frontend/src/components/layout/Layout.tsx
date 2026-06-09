import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  QueueListIcon,
  ChartBarIcon,
  TrophyIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/auth.store'
import { ErrorBoundary } from '../ui/ErrorBoundary'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    Icon: HomeIcon },
  { to: '/transactions', label: 'Transactions', Icon: QueueListIcon },
  { to: '/budgets',      label: 'Budgets',      Icon: ChartBarIcon },
  { to: '/goals',        label: 'Goals',        Icon: TrophyIcon },
  { to: '/accounts',     label: 'Accounts',     Icon: BanknotesIcon },
  { to: '/household',    label: 'Household',    Icon: UsersIcon },
  { to: '/settings',     label: 'Settings',     Icon: Cog6ToothIcon },
]

export function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const nav = useNavigate()

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F5F8]">
      {/* Sidebar — icons only on mobile, full on desktop */}
      <aside className="w-[60px] md:w-[220px] bg-white border-r border-black/[0.07] flex flex-col py-6 flex-shrink-0 transition-all">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 md:px-5 pb-7 justify-center md:justify-start">
          <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="hidden md:block text-[18px] font-semibold text-text-1 tracking-tight">finlo</span>
        </div>

        <p className="hidden md:block text-[10px] font-medium text-text-4 uppercase tracking-widest px-5 mb-1.5">
          Menu
        </p>

        {/* Nav links */}
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 md:px-4 py-2.5 mx-1 md:mx-2 rounded-[10px] text-[13px] font-medium transition-all mb-0.5 justify-center md:justify-start
               ${isActive
                 ? 'bg-primary-100 text-primary'
                 : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 md:w-4 md:h-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                <span className="hidden md:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* User */}
        <div className="px-2 md:px-4 pt-4 border-t border-black/[0.07] flex items-center gap-3 justify-center md:justify-start">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
            {initials}
          </div>
          <div className="hidden md:flex flex-1 min-w-0 flex-col">
            <p className="text-[12px] font-medium text-text-1 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-text-3 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); nav('/login') }}
            className="hidden md:block text-text-3 hover:text-danger transition-colors flex-shrink-0"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile logout */}
        <button
          onClick={() => { logout(); nav('/login') }}
          className="md:hidden mt-3 mx-auto text-text-3 hover:text-danger transition-colors"
          title="Sign out"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
        </button>
      </aside>

      {/* Page content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
