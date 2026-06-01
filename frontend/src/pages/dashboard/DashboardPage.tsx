import { format, subDays, startOfMonth } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useAccounts } from '../../hooks/useAccounts'
import { useTransactions, useTransactionSummary } from '../../hooks/useTransactions'
import { MetricCard } from '../../components/ui/MetricCard'
import { SpendingChart } from '../../components/charts/SpendingChart'
import { DonutChart } from '../../components/charts/DonutChart'
import { ErrorBoundary } from '../../components/ui/ErrorBoundary'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

const CATEGORY_COLORS = [
  '#7C5CFC', '#1DB87A', '#F5A623', '#F04E4E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const sevenDaysAgo = format(subDays(now, 6), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: summary, isLoading: loadingSummary } = useTransactionSummary(month, year)
  const { data: recentData, isLoading: loadingRecent } = useTransactions({ pageSize: 5, sortBy: 'date', sortDir: 'desc' })
  const { data: weekData } = useTransactions({ from: sevenDaysAgo, to: today, pageSize: 200 })
  const { data: monthData } = useTransactions({ from: monthStart, to: today, pageSize: 500 })

  const netWorth = accounts?.reduce((sum: number, a: any) => sum + a.balance, 0) ?? 0
  const savingsRate = summary?.income > 0 ? ((summary.income - summary.expenses) / summary.income) * 100 : 0

  const spendByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(now, i), 'EEE')
    spendByDay[d] = 0
  }
  if (weekData?.data) {
    for (const t of weekData.data) {
      if (t.amount > 0) {
        const d = format(new Date(t.date), 'EEE')
        spendByDay[d] = (spendByDay[d] ?? 0) + t.amount
      }
    }
  }
  const chartData = Object.entries(spendByDay).map(([day, amount]) => ({ day, amount }))

  const catMap: Record<string, { name: string; value: number }> = {}
  if (monthData?.data) {
    for (const t of monthData.data) {
      if (t.amount > 0 && t.category) {
        const k = t.category.id
        catMap[k] = { name: t.category.name, value: (catMap[k]?.value ?? 0) + t.amount }
      }
    }
  }
  const donutData = Object.entries(catMap)
    .map(([, v]) => ({ name: v.name, value: v.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((d, i) => ({ ...d, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-text-1">Dashboard</h1>
        <p className="text-[14px] text-text-2 mt-0.5">Hey, {user?.firstName} 👋</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {loadingAccounts || loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px]" />)
        ) : (
          <>
            <MetricCard label="Net worth" value={CAD.format(netWorth)} accent />
            <MetricCard label="Monthly income" value={CAD.format(summary?.income ?? 0)} changeType="up" />
            <MetricCard label="Monthly spend" value={CAD.format(summary?.expenses ?? 0)} changeType="down" />
            <MetricCard
              label="Savings rate"
              value={`${savingsRate.toFixed(1)}%`}
              changeType={savingsRate >= 20 ? 'up' : 'neutral'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ErrorBoundary>
          <div className="card p-5">
            <p className="text-[13px] font-semibold text-text-1 mb-4">Spending — last 7 days</p>
            <SpendingChart data={chartData} />
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <div className="card p-5">
            <p className="text-[13px] font-semibold text-text-1 mb-4">Spend by category — this month</p>
            {donutData.length > 0 ? (
            <>
              <DonutChart data={donutData} />
              <div className="mt-3 space-y-1.5">
                {donutData.slice(0, 5).map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-text-2">{d.name}</span>
                    </div>
                    <span className="text-text-1 font-medium">{CAD.format(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[13px] text-text-3">
              No transactions this week
            </div>
          )}
          </div>
        </ErrorBoundary>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-text-1">Recent transactions</p>
          <Link to="/transactions" className="text-[12px] text-primary hover:underline">View all</Link>
        </div>
        {loadingRecent ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : recentData?.data?.length === 0 ? (
          <p className="text-[13px] text-text-3 text-center py-6">
            No transactions yet — connect a bank to get started
          </p>
        ) : (
          <div className="space-y-1">
            {recentData?.data?.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-black/[0.04] last:border-0">
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ background: t.category ? CATEGORY_COLORS[0] : '#C4C2CE' }}
                >
                  {(t.merchantName ?? t.description).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-1 truncate">{t.merchantName ?? t.description}</p>
                  {t.category && <span className="badge badge-neutral text-[10px]">{t.category.name}</span>}
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-semibold ${t.amount < 0 ? 'text-success' : 'text-text-1'}`}>
                    {t.amount < 0 ? '+' : ''}{CAD.format(Math.abs(t.amount))}
                  </p>
                  <p className="text-[11px] text-text-3">{format(new Date(t.date), 'MMM d')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
