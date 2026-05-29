import { useState, useMemo } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useTransactions, useTransactionSummary, useUpdateTransaction } from '../../hooks/useTransactions'
import { useAccounts } from '../../hooks/useAccounts'
import { Drawer } from '../../components/ui/Drawer'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function dateHeader(date: string) {
  const d = new Date(date)
  if (isToday(d)) return `Today · ${format(d, 'MMM d')}`
  if (isYesterday(d)) return `Yesterday · ${format(d, 'MMM d')}`
  return format(d, 'EEEE · MMM d')
}

function groupByDate(txns: any[]) {
  const groups: Record<string, any[]> = {}
  for (const t of txns) {
    const key = format(new Date(t.date), 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

export function TransactionsPage() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  const filters = useMemo(() => ({
    page,
    pageSize: 30,
    search: search || undefined,
    type: tab === 'all' ? undefined : tab,
    from: from || undefined,
    to: to || undefined,
    accountId: accountId || undefined,
  }), [page, search, tab, from, to, accountId])

  const { data, isLoading } = useTransactions(filters)
  const { data: summary } = useTransactionSummary(month, year)
  const { data: accounts } = useAccounts()
  const updateTx = useUpdateTransaction()

  const groups = useMemo(() => groupByDate(data?.data ?? []), [data])

  const openDrawer = (tx: any) => {
    setSelectedTx(tx)
    setEditNotes(tx.notes ?? '')
    setEditCategoryId(tx.categoryId ?? '')
  }

  const saveEdit = async () => {
    if (!selectedTx) return
    await updateTx.mutateAsync({ id: selectedTx.id, data: { notes: editNotes, categoryId: editCategoryId || undefined } })
    setSelectedTx(null)
  }

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expenses' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-1">Transactions</h1>
      </div>

      {/* Search + filter row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input
            className="input pl-9"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn btn-ghost ${showFilters ? 'bg-primary-100 text-primary border-primary-200' : ''}`}
        >
          <FunnelIcon className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">From date</label>
            <input type="date" className="input text-[12px]" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">To date</label>
            <input type="date" className="input text-[12px]" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Account</label>
            <select className="input text-[12px]" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1) }}>
              <option value="">All accounts</option>
              {accounts?.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} {a.mask ? `····${a.mask}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); setPage(1) }}
            className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-all
              ${tab === t.key ? 'bg-white text-text-1 shadow-sm' : 'text-text-2 hover:text-text-1'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="card p-4 flex gap-6">
          <div>
            <span className="text-[11px] text-text-3 block">Income</span>
            <span className="text-[16px] font-semibold text-success">{CAD.format(summary.income)}</span>
          </div>
          <div className="w-px bg-surface-3" />
          <div>
            <span className="text-[11px] text-text-3 block">Expenses</span>
            <span className="text-[16px] font-semibold text-danger">{CAD.format(summary.expenses)}</span>
          </div>
          <div className="w-px bg-surface-3" />
          <div>
            <span className="text-[11px] text-text-3 block">Net</span>
            <span className={`text-[16px] font-semibold ${summary.net >= 0 ? 'text-primary' : 'text-danger'}`}>
              {CAD.format(summary.net)}
            </span>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="card">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-text-3">No transactions found</div>
        ) : (
          <div>
            {Object.entries(groups).map(([date, txns]) => (
              <div key={date}>
                <div className="px-5 py-2 bg-surface-2 border-b border-black/[0.05]">
                  <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wide">
                    {dateHeader(date)}
                  </span>
                </div>
                {txns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] last:border-0 hover:bg-surface-2/50 cursor-pointer transition-colors"
                    onClick={() => openDrawer(t)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                      {(t.merchantName ?? t.description).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-1 truncate">{t.merchantName ?? t.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {t.category && <span className="badge badge-neutral text-[10px]">{t.category.name}</span>}
                        {t.account && <span className="text-[11px] text-text-4">{t.account.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-semibold ${t.amount < 0 ? 'text-success' : 'text-text-1'}`}>
                        {t.amount < 0 ? '+' : ''}{CAD.format(Math.abs(t.amount))}
                      </p>
                      <p className="text-[11px] text-text-3">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {data && page < data.meta?.totalPages && (
          <div className="p-4 text-center border-t border-black/[0.05]">
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(page + 1)}>
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Transaction detail drawer */}
      <Drawer open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction details">
        {selectedTx && (
          <div className="space-y-5">
            <div className="text-center py-2">
              <p className={`text-[28px] font-semibold ${selectedTx.amount < 0 ? 'text-success' : 'text-text-1'}`}>
                {selectedTx.amount < 0 ? '+' : ''}{CAD.format(Math.abs(selectedTx.amount))}
              </p>
              <p className="text-[13px] text-text-2 mt-1">{selectedTx.merchantName ?? selectedTx.description}</p>
              <p className="text-[12px] text-text-3 mt-0.5">{format(new Date(selectedTx.date), 'MMM d, yyyy')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-text-3 font-medium mb-1.5 block">Category</label>
                <input
                  className="input"
                  placeholder="Category ID"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-text-3 font-medium mb-1.5 block">Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Add a note..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={saveEdit}
                disabled={updateTx.isPending}
              >
                {updateTx.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
