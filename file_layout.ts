import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  QueueListIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowsRightLeftIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/auth.store'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    Icon: HomeIcon },
  { to: '/transactions', label: 'Transactions', Icon: QueueListIcon },
  { to: '/budgets',      label: 'Budgets',      Icon: ChartBarIcon },
  { to: '/goals',        label: 'Goals',        Icon: TrophyIcon },
  { to: '/transfer',     label: 'Transfer',     Icon: ArrowsRightLeftIcon },
  { to: '/investments',  label: 'Investments',  Icon: ArrowTrendingUpIcon },
  { to: '/accounts',     label: 'Accounts',     Icon: BanknotesIcon },
]

export function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const nav = useNavigate()

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F5F8]">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-black/[0.07] flex flex-col py-6 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pb-7">
          <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-[18px] font-semibold text-text-1 tracking-tight">finlo</span>
        </div>

        <p className="text-[10px] font-medium text-text-4 uppercase tracking-widest px-5 mb-1.5">
          Menu
        </p>

        {/* Nav links */}
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-[10px] text-[13px] font-medium transition-all mb-0.5
               ${isActive
                 ? 'bg-primary-100 text-primary'
                 : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* User */}
        <div className="px-4 pt-4 border-t border-black/[0.07] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-text-1 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-text-3 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); nav('/login') }}
            className="text-text-3 hover:text-danger transition-colors flex-shrink-0"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
