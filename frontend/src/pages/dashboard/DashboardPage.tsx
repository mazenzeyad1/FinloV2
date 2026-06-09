import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useAccounts } from '../../hooks/useAccounts'
import { useTransactions, useMonthlySummary } from '../../hooks/useTransactions'
import { MetricCard } from '../../components/ui/MetricCard'
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

function localDate(dateStr: string) {
  return new Date(dateStr.substring(0, 10) + 'T12:00:00')
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()

  // Single summary call replaces the previous 4 useTransactions fetches
  const { data: monthlySummary, isLoading: loadingSummary } = useMonthlySummary(2)

  // Recent transactions — still needed for the feed
  const { data: recentData, isLoading: loadingRecent } = useTransactions({
    pageSize: 5, sortBy: 'date', sortDir: 'desc',
  })

  // Donut: last 30 days of categorised expenses (small fetch, needed for chart)
  const thirtyDaysAgo = format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), 'yyyy-MM-dd')
  const { data: monthData } = useTransactions({ from: thirtyDaysAgo, to: today, pageSize: 500 })

  const LIABILITY_TYPES = ['credit', 'loan']
  const netWorth = accounts?.reduce((sum: number, a: any) => {
    const balance = a.balance ?? 0
    return sum + (LIABILITY_TYPES.includes(a.type) ? -balance : balance)
  }, 0) ?? 0

  // Current and previous month figures from the monthly summary endpoint
  const currentMonth = monthlySummary?.[monthlySummary.length - 1]
  const prevMonth    = monthlySummary?.[monthlySummary.length - 2]
  const income   = currentMonth?.income   ?? 0
  const expenses = currentMonth?.expenses ?? 0
  const prevIncome   = prevMonth?.income   ?? 0
  const prevExpenses = prevMonth?.expenses ?? 0

  const rawSavingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const savingsRate = Math.max(-100, Math.min(100, rawSavingsRate))

  const pctDelta = (curr: number, prev: number) => (prev > 0 ? ((curr - prev) / prev) * 100 : null)
  const incomeDelta  = pctDelta(income, prevIncome)
  const expenseDelta = pctDelta(expenses, prevExpenses)
  const fmtDelta = (d: number | null) => (d == null ? undefined : `${d >= 0 ? '+' : ''}${d.toFixed(0)}% vs last month`)

  // Donut data
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

  const isLoading = loadingAccounts || loadingSummary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-text-1">Dashboard</h1>
        <p className="text-[14px] text-text-2 mt-0.5">Hey, {user?.firstName} 👋</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px]" />)
        ) : (
          <>
            <MetricCard label="Net worth" value={CAD.format(netWorth)} accent />
            <MetricCard
              label="Income (month)"
              value={CAD.format(income)}
              change={fmtDelta(incomeDelta)}
              changeType={incomeDelta == null ? 'neutral' : incomeDelta >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              label="Spend (month)"
              value={CAD.format(expenses)}
              change={fmtDelta(expenseDelta)}
              changeType={expenseDelta == null ? 'neutral' : expenseDelta <= 0 ? 'up' : 'down'}
            />
            <MetricCard
              label="Savings rate"
              value={income > 0 ? `${savingsRate.toFixed(0)}%` : '—'}
              change={
                income <= 0 ? 'No income this month'
                : rawSavingsRate < 0 ? 'Spending exceeds income'
                : rawSavingsRate >= 20 ? 'On track'
                : undefined
              }
              changeType={rawSavingsRate >= 20 ? 'up' : rawSavingsRate < 0 ? 'down' : 'neutral'}
            />
          </>
        )}
      </div>

      {/* Spend by category donut */}
      <ErrorBoundary>
        <div className="card p-5">
          <p className="text-[13px] font-semibold text-text-1 mb-4">Spend by category — last 30 days</p>
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
              No spending in the last 30 days
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* Recent transactions */}
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
                  <p className="text-[11px] text-text-3">{format(localDate(t.date), 'MMM d')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
