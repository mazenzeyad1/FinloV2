import { useState, useMemo } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, XMarkIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, ChartPieIcon } from '@heroicons/react/24/outline'
import { useBudgetSummary, useUpsertBudget, useCopyBudgets } from '../../hooks/useBudgets'
import { useCreateCategory, useDeleteCategory } from '../../hooks/useTransactions'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../store/toast.store'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })
const CAD0 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

function statusOf(pct: number, hasPlan: boolean): 'none' | 'good' | 'warn' | 'over' {
  if (!hasPlan) return 'none'
  if (pct > 100) return 'over'
  if (pct >= 80) return 'warn'
  return 'good'
}

const DOT: Record<string, string> = {
  none: 'bg-text-4/30',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  over: 'bg-red-500',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

export function BudgetsPage() {
  const [current, setCurrent] = useState(new Date())
  const month = current.getMonth() + 1
  const year = current.getFullYear()

  const { data: summary, isLoading } = useBudgetSummary(year, month)
  const upsert = useUpsertBudget()
  const copy = useCopyBudgets()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [newCatName, setNewCatName] = useState('')

  // A category appears on the budget if it has a planned amount, OR it's the one
  // currently being added (so its inline editor is visible before the first save).
  const budgeted = useMemo(
    () => (summary ?? []).filter((i: any) => i.plannedAmount > 0 || i.categoryId === editing),
    [summary, editing],
  )

  const groups: Record<string, any[]> = {}
  for (const item of budgeted) {
    if (!groups[item.groupName]) groups[item.groupName] = []
    groups[item.groupName].push(item)
  }

  // Categories not yet budgeted — candidates for the "Add budget" picker
  const available = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    return (summary ?? [])
      .filter((i: any) => i.plannedAmount === 0)
      .filter((i: any) => !q || i.categoryName.toLowerCase().includes(q) || i.groupName.toLowerCase().includes(q))
  }, [summary, pickerSearch])

  const availableGroups: Record<string, any[]> = {}
  for (const item of available) {
    if (!availableGroups[item.groupName]) availableGroups[item.groupName] = []
    availableGroups[item.groupName].push(item)
  }

  const hasBudgets = (summary ?? []).some((i: any) => i.plannedAmount > 0)

  // Totals across budgeted categories only
  const totalBudgeted = budgeted.reduce((s: number, i: any) => s + (i.plannedAmount ?? 0), 0)
  const totalSpent = budgeted.reduce((s: number, i: any) => s + (i.spentAmount ?? 0), 0)
  const safeToSpend = totalBudgeted - totalSpent
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  // Per-day pacing (only for the live month)
  const now = new Date()
  const isCurrentMonth = current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear()
  const isPast = current < new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth
  const perDay = safeToSpend > 0 ? safeToSpend / daysLeft : 0

  const startEdit = (catId: string, planned: number) => {
    setEditing(catId)
    setEditVal(planned ? String(planned) : '')
  }

  const saveEdit = async (catId: string) => {
    const trimmed = editVal.trim()
    const amount = trimmed === '' ? 0 : parseFloat(trimmed)
    if (!isNaN(amount) && amount >= 0) {
      try {
        await upsert.mutateAsync({ categoryId: catId, year, month, plannedAmount: amount })
        toast.success(amount === 0 ? 'Budget removed' : 'Budget saved')
      } catch {
        toast.error('Could not save budget')
      }
    }
    setEditing(null)
  }

  const removeBudget = async (catId: string) => {
    try {
      await upsert.mutateAsync({ categoryId: catId, year, month, plannedAmount: 0 })
      toast.success('Budget removed')
    } catch {
      toast.error('Could not remove budget')
    }
    setEditing(null)
  }

  const pickCategory = (catId: string) => {
    setShowPicker(false)
    setPickerSearch('')
    startEdit(catId, 0)
  }

  const handleCreateCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    try {
      const cat = await createCategory.mutateAsync(name)
      toast.success(`Created "${cat.name}"`)
      setNewCatName('')
      setShowPicker(false)
      setPickerSearch('')
      startEdit(cat.id, 0)
    } catch (e: any) {
      toast.error(e?.response?.status === 409 ? 'That category already exists' : 'Could not create category')
    }
  }

  const handleDeleteCustom = async (catId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"? Any transactions tagged with it become uncategorized.`)) return
    try {
      await deleteCategory.mutateAsync(catId)
      toast.success(`Deleted "${name}"`)
    } catch {
      toast.error('Could not delete category')
    }
  }

  const handleCopy = async () => {
    try {
      const result = await copy.mutateAsync({ year, month })
      if (result.copied > 0) toast.success(`Copied ${result.copied} budgets from last month`)
      else toast.info('No budgets found in the previous month')
    } catch {
      toast.error('Could not copy budgets')
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Header + month nav ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[22px] font-semibold text-text-1">Budgets</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1">
            <button onClick={() => setCurrent(subMonths(current, 1))} className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-text-2 transition-all">
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold text-text-1 px-2 min-w-[110px] text-center">
              {format(current, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrent(addMonths(current, 1))} className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-text-2 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36" />
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !hasBudgets && !editing ? (
        /* ── Empty state ── */
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ChartPieIcon className="w-6 h-6 text-primary" />
          </div>
          <p className="text-[16px] font-semibold text-text-1 mb-1.5">No budgets yet</p>
          <p className="text-[13px] text-text-3 mb-5 max-w-sm mx-auto">
            Add a budget for any category you want to keep an eye on. Only the ones you choose show up here — nothing else.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setShowPicker(true)} className="btn btn-primary btn-sm">
              <PlusIcon className="w-4 h-4" /> Add your first budget
            </button>
            <button onClick={handleCopy} disabled={copy.isPending} className="btn btn-ghost btn-sm">
              {copy.isPending ? 'Copying…' : 'Copy last month'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Hero: Safe to spend ── */}
          {totalBudgeted > 0 && (
            <div className="card p-6 bg-gradient-to-br from-primary/[0.04] to-transparent">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[12px] font-medium text-text-3 mb-1">
                    {isPast ? 'Was left to spend' : 'Safe to spend'}{!isPast && isCurrentMonth ? ' this month' : ''}
                  </p>
                  <p className={`text-[40px] font-bold leading-none ${safeToSpend >= 0 ? 'text-text-1' : 'text-red-500'}`}>
                    {CAD.format(Math.abs(safeToSpend))}
                    {safeToSpend < 0 && <span className="text-[16px] font-semibold ml-2 align-middle">over</span>}
                  </p>
                  {isCurrentMonth && safeToSpend > 0 && (
                    <p className="text-[13px] text-text-3 mt-2">
                      <span className="font-semibold text-text-2">{CAD0.format(perDay)}/day</span> for the next {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-text-2">
                    <span className="font-semibold text-text-1">{CAD.format(totalSpent)}</span> spent
                  </p>
                  <p className="text-[13px] text-text-3">of {CAD.format(totalBudgeted)} budgeted</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overallPct > 100 ? 'bg-red-500' : overallPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, overallPct)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-text-4">{overallPct.toFixed(0)}% of budget used</p>
              </div>
            </div>
          )}

          {/* ── Budgeted category groups ── */}
          {Object.entries(groups).map(([groupName, items]) => {
            const groupBudget = items.reduce((s: number, i: any) => s + (i.plannedAmount ?? 0), 0)
            const groupSpent = items.reduce((s: number, i: any) => s + (i.spentAmount ?? 0), 0)

            return (
              <div key={groupName} className="card overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between bg-surface-2/50 border-b border-black/[0.05]">
                  <p className="text-[12px] font-semibold text-text-2 uppercase tracking-wide">{groupName}</p>
                  {groupBudget > 0 && (
                    <p className="text-[11px] text-text-3 tabular-nums">{CAD0.format(groupSpent)} / {CAD0.format(groupBudget)}</p>
                  )}
                </div>

                <div className="divide-y divide-black/[0.04]">
                  {items.map((item: any) => {
                    const hasPlan = item.plannedAmount > 0
                    const pct = item.percentUsed ?? 0
                    const status = statusOf(pct, hasPlan)
                    const remaining = item.remaining ?? (item.plannedAmount - item.spentAmount)
                    const isEditing = editing === item.categoryId

                    return (
                      <div key={item.categoryId} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[status]}`} />

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-text-1 truncate">{item.categoryName}</p>
                            {hasPlan ? (
                              <p className="text-[11px] text-text-3 tabular-nums mt-0.5">
                                {CAD.format(item.spentAmount)} spent
                                {remaining >= 0
                                  ? <span className="text-emerald-600"> · {CAD.format(remaining)} left</span>
                                  : <span className="text-red-500"> · {CAD.format(Math.abs(remaining))} over</span>}
                              </p>
                            ) : (
                              <p className="text-[11px] text-text-4 mt-0.5">Enter a monthly amount →</p>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[13px] text-text-3">$</span>
                              <input
                                className="input text-[13px] w-24 py-1 px-2"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(item.categoryId)
                                  if (e.key === 'Escape') setEditing(null)
                                }}
                                placeholder="0"
                                inputMode="decimal"
                                autoFocus
                              />
                              <button onClick={() => saveEdit(item.categoryId)} className="text-emerald-600 hover:bg-emerald-50 rounded-md p-1" title="Save">
                                <CheckIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditing(null)} className="text-text-3 hover:bg-surface-2 rounded-md p-1" title="Cancel">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                              {hasPlan && (
                                <button onClick={() => removeBudget(item.categoryId)} className="text-text-3 hover:text-red-500 hover:bg-red-50 rounded-md p-1" title="Remove budget">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(item.categoryId, item.plannedAmount)}
                              className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text-1 hover:bg-surface-2 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {CAD0.format(item.plannedAmount)}
                            </button>
                          )}
                        </div>

                        {hasPlan && (
                          <div className="mt-2.5 ml-5">
                            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${DOT[status]}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* ── Add budget / Copy actions ── */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-black/15 text-[13px] font-medium text-text-2 hover:border-primary/40 hover:text-primary hover:bg-primary/[0.03] transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Add budget
            </button>
            <button onClick={handleCopy} disabled={copy.isPending} className="btn btn-ghost btn-sm">
              {copy.isPending ? 'Copying…' : 'Copy last month'}
            </button>
          </div>
        </>
      )}

      {/* ── Category picker modal ── */}
      <Modal open={showPicker} onClose={() => { setShowPicker(false); setPickerSearch(''); setNewCatName('') }} title="Add a budget">
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              className="input pl-9"
              placeholder="Search categories…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[44vh] overflow-y-auto -mx-1 px-1">
            {available.length === 0 ? (
              <p className="text-[13px] text-text-3 text-center py-6">
                {pickerSearch ? 'No matches — create it below.' : 'Every category already has a budget.'}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(availableGroups).map(([groupName, items]) => (
                  <div key={groupName}>
                    <p className="text-[10px] font-semibold text-text-4 uppercase tracking-wider mb-1 px-2">{groupName}</p>
                    <div className="space-y-0.5">
                      {items.map((item: any) => (
                        <div key={item.categoryId} className="flex items-center rounded-lg hover:bg-surface-2 transition-colors group">
                          <button
                            onClick={() => pickCategory(item.categoryId)}
                            className="flex-1 flex items-center justify-between px-3 py-2 text-left min-w-0"
                          >
                            <span className="text-[13px] font-medium text-text-1 truncate">{item.categoryName}</span>
                            <span className="flex items-center gap-1.5 text-[11px] text-text-4 flex-shrink-0">
                              {item.spentAmount > 0 && <span className="text-text-3">{CAD0.format(item.spentAmount)} spent</span>}
                              <PlusIcon className="w-4 h-4 text-text-3 group-hover:text-primary" />
                            </span>
                          </button>
                          {item.isCustom && (
                            <button
                              onClick={(e) => handleDeleteCustom(item.categoryId, item.categoryName, e)}
                              className="px-2.5 self-stretch flex items-center text-text-4 hover:text-red-500"
                              title="Delete custom category"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create a custom category */}
          <div className="pt-3 border-t border-black/[0.06]">
            <p className="text-[11px] font-semibold text-text-3 mb-1.5">Don't see it? Create your own</p>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="e.g. Daycare"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }}
                maxLength={30}
              />
              <button
                className="btn btn-primary"
                onClick={handleCreateCategory}
                disabled={!newCatName.trim() || createCategory.isPending}
              >
                {createCategory.isPending ? 'Adding…' : 'Create'}
              </button>
            </div>
            <p className="text-[10px] text-text-4 mt-1.5">Filed under "Other". Tag transactions to it yourself — the AI only auto-sorts built-in categories.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
