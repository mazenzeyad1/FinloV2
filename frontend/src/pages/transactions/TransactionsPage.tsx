import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTransactions, useUpdateTransaction, useCategories, useBulkUpdateCategory } from '../../hooks/useTransactions'
import { useAccounts } from '../../hooks/useAccounts'
import { api } from '../../lib/api'
import { toast } from '../../store/toast.store'
import { Drawer } from '../../components/ui/Drawer'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function localDate(dateStr: string) {
  return new Date(dateStr.substring(0, 10) + 'T12:00:00')
}

function dateHeader(date: string) {
  const d = localDate(date)
  if (isToday(d)) return `Today · ${format(d, 'MMM d')}`
  if (isYesterday(d)) return `Yesterday · ${format(d, 'MMM d')}`
  return format(d, 'EEEE · MMM d')
}

function groupByDate(txns: any[]) {
  const groups: Record<string, any[]> = {}
  for (const t of txns) {
    const key = t.date.substring(0, 10)
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

// Deterministic pastel color from a string
function avatarColor(name: string) {
  const colors = [
    'bg-violet-100 text-violet-600',
    'bg-blue-100 text-blue-600',
    'bg-emerald-100 text-emerald-600',
    'bg-orange-100 text-orange-600',
    'bg-pink-100 text-pink-600',
    'bg-cyan-100 text-cyan-600',
    'bg-amber-100 text-amber-700',
    'bg-indigo-100 text-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const UNCATEGORIZED = '__uncategorized__'

export function TransactionsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all')
  const [showFilters, setShowFilters] = useState(!!(searchParams.get('accountId') || searchParams.get('category')))
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [accountId, setAccountId] = useState(searchParams.get('accountId') ?? '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') ?? '')
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(() => ({
    page,
    pageSize: 30,
    search: search || undefined,
    type: tab === 'all' ? undefined : tab,
    from: from || undefined,
    to: to || undefined,
    accountId: accountId || undefined,
    categoryId: categoryFilter && categoryFilter !== UNCATEGORIZED ? categoryFilter : undefined,
    uncategorized: categoryFilter === UNCATEGORIZED ? true : undefined,
  }), [page, search, tab, from, to, accountId, categoryFilter])

  const { data, isLoading } = useTransactions(filters)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const updateTx = useUpdateTransaction()
  const bulkCategory = useBulkUpdateCategory()

  const groups = useMemo(() => groupByDate(data?.data ?? []), [data])

  const income = useMemo(() => data?.data?.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0) ?? 0, [data])
  const expenses = useMemo(() => data?.data?.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0) ?? 0, [data])
  const net = income - expenses

  const activeFilterCount = [from, to, accountId, categoryFilter].filter(Boolean).length

  const openDrawer = (tx: any) => {
    setSelectedTx(tx)
    setEditNotes(tx.notes ?? '')
    setEditCategoryId(tx.categoryId ?? '')
  }

  const saveEdit = async () => {
    if (!selectedTx) return
    try {
      await updateTx.mutateAsync({ id: selectedTx.id, data: { notes: editNotes, categoryId: editCategoryId || undefined } })
      toast.success('Transaction updated')
      setSelectedTx(null)
    } catch {
      toast.error('Could not update transaction')
    }
  }

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const clearSelection = () => { setSelectedIds(new Set()); setBulkCategoryId('') }
  const selectAllVisible = () => setSelectedIds(new Set((data?.data ?? []).map((t: any) => t.id)))

  const applyBulk = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return
    const count = selectedIds.size
    try {
      await bulkCategory.mutateAsync({ ids: [...selectedIds], categoryId: bulkCategoryId })
      const catName = categories?.find((c) => c.id === bulkCategoryId)?.name ?? 'category'
      toast.success(`Categorized ${count} transaction${count > 1 ? 's' : ''} as ${catName}`)
      clearSelection()
    } catch {
      toast.error('Could not update categories')
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const PAGE_SIZE = 500
      const rows: any[] = []
      let pageNum = 1
      let totalPages = 1
      do {
        const res = await api.get('/transactions', { params: { ...filters, page: pageNum, pageSize: PAGE_SIZE } })
        rows.push(...res.data.data)
        totalPages = res.data.meta?.totalPages ?? 1
        pageNum++
      } while (pageNum <= totalPages)
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const header = ['Date', 'Merchant', 'Description', 'Category', 'Account', 'Amount', 'Type', 'Notes']
      const lines = rows.map((t) => [
        t.date.substring(0, 10),
        t.merchantName ?? '',
        t.description ?? '',
        t.category?.name ?? 'Uncategorized',
        t.account?.name ?? '',
        Math.abs(t.amount).toFixed(2),
        t.amount < 0 ? 'Income' : 'Expense',
        t.notes ?? '',
      ].map(esc).join(','))
      const csv = [header.map(esc).join(','), ...lines].join('\r\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finlo-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${rows.length} transaction${rows.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Could not export transactions')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold text-text-1">Transactions</h1>
          {/* Tabs inline with title */}
          <div className="flex items-center gap-0.5 bg-surface-2 p-1 rounded-xl">
            {(['all', 'income', 'expense'] as const).map((key) => (
              <button
                key={key}
                onClick={() => { setTab(key); setPage(1) }}
                className={`px-3 py-1 rounded-[8px] text-[12px] font-medium transition-all
                  ${tab === key ? 'bg-white text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1'}`}
              >
                {key === 'all' ? 'All' : key === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn btn-ghost btn-sm">
          <ArrowDownTrayIcon className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>

      {/* ── Search + filter row ── */}
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
          className={`btn btn-sm flex items-center gap-1.5 border ${
            activeFilterCount > 0
              ? 'bg-primary/10 text-primary border-primary/25 hover:bg-primary/15'
              : 'btn-ghost'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div>
              <label className="text-[11px] text-text-3 font-medium mb-1 block">From</label>
              <input type="date" className="input text-[13px]" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="text-[11px] text-text-3 font-medium mb-1 block">To</label>
              <input type="date" className="input text-[13px]" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="text-[11px] text-text-3 font-medium mb-1 block">Account</label>
              <select className="input text-[13px]" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1) }}>
                <option value="">All accounts</option>
                {accounts?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}{a.mask ? ` ····${a.mask}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-3 font-medium mb-1 block">Category</label>
              <select className="input text-[13px]" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
                <option value="">All categories</option>
                <option value={UNCATEGORIZED}>Uncategorized only</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.groupName} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFrom(''); setTo(''); setAccountId(''); setCategoryFilter(''); setPage(1) }}
              className="text-[12px] text-danger hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Summary strip ── */}
      {data && data.data?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[12px] font-medium">
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">In</span>
            {CAD.format(income)}
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[12px] font-medium">
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Out</span>
            {CAD.format(expenses)}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium
            ${net >= 0 ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-600'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Net</span>
            {net >= 0 ? '+' : ''}{CAD.format(net)}
          </div>
          {data.meta?.total && (
            <span className="text-[12px] text-text-4 ml-auto">
              {data.meta.total.toLocaleString()} transaction{data.meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Bulk-action bar ── */}
      {selectedIds.size > 0 && (
        <div className="card p-3 flex items-center gap-3 flex-wrap border-primary/20 bg-primary/5">
          <span className="text-[13px] font-semibold text-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 flex-1">
            <select
              className="input text-[12px] flex-1 max-w-[220px]"
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
            >
              <option value="">Set category…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.groupName} — {c.name}</option>
              ))}
            </select>
            <button onClick={applyBulk} disabled={!bulkCategoryId || bulkCategory.isPending} className="btn btn-primary btn-sm">
              {bulkCategory.isPending ? 'Applying…' : 'Apply'}
            </button>
          </div>
          {selectedIds.size < (data?.data?.length ?? 0) && (
            <button onClick={selectAllVisible} className="text-[12px] text-text-2 hover:text-text-1">
              Select all {data?.data?.length}
            </button>
          )}
          <button onClick={clearSelection} className="text-text-3 hover:text-text-1 ml-auto">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Transaction list ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[14px] font-medium text-text-2 mb-1">No transactions found</p>
            <p className="text-[13px] text-text-3">Try adjusting your filters or search</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, txns]) => (
            <div key={date}>
              {/* Date group header */}
              <div className="px-5 py-2.5 bg-surface-2/70 border-y border-black/[0.04] first:border-t-0">
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">
                  {dateHeader(date)}
                </span>
              </div>

              {txns.map((t) => {
                const selected = selectedIds.has(t.id)
                const label = t.merchantName ?? t.description
                const isIncome = t.amount < 0
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3.5 px-5 py-3.5 border-b border-black/[0.04] last:border-0 cursor-pointer transition-colors
                      ${selected ? 'bg-primary/5' : 'hover:bg-surface-2/40'}`}
                    onClick={() => openDrawer(t)}
                  >
                    {/* Checkbox — always present but subtle */}
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(t.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${label}`}
                      className="w-4 h-4 rounded border-black/20 text-primary focus:ring-primary/30 cursor-pointer flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                    />

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${avatarColor(label)}`}>
                      {label.charAt(0).toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-1 truncate">{label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.category
                          ? <span className="text-[11px] text-text-3 bg-surface-2 px-2 py-0.5 rounded-full">{t.category.name}</span>
                          : <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Uncategorized</span>
                        }
                        {t.account && (
                          <span className="text-[11px] text-text-4 truncate hidden sm:block">{t.account.name}</span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[14px] font-semibold tabular-nums ${isIncome ? 'text-emerald-600' : 'text-text-1'}`}>
                        {isIncome ? '+' : '-'}{CAD.format(Math.abs(t.amount))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
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

      {/* ── Transaction detail drawer ── */}
      <Drawer open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction details">
        {selectedTx && (
          <div className="space-y-5">
            {/* Amount hero */}
            <div className="text-center py-3 border-b border-black/[0.06]">
              <p className={`text-[32px] font-bold tabular-nums ${selectedTx.amount < 0 ? 'text-emerald-600' : 'text-text-1'}`}>
                {selectedTx.amount < 0 ? '+' : '-'}{CAD.format(Math.abs(selectedTx.amount))}
              </p>
              <p className="text-[14px] font-medium text-text-2 mt-1">{selectedTx.merchantName ?? selectedTx.description}</p>
              <p className="text-[12px] text-text-3 mt-0.5">{format(localDate(selectedTx.date), 'EEEE, MMM d, yyyy')}</p>
              {selectedTx.account && (
                <p className="text-[11px] text-text-4 mt-0.5">{selectedTx.account.name}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-text-3 font-medium mb-1.5 block uppercase tracking-wide">Category</label>
                <select
                  className="input"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.groupName} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-text-3 font-medium mb-1.5 block uppercase tracking-wide">Notes</label>
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
