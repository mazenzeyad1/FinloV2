import { useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useBudgetSummary, useUpsertBudget, useCopyBudgets } from '../../hooks/useBudgets'
import { ProgressBar } from '../../components/ui/ProgressBar'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function progressColor(pct: number): 'success' | 'warning' | 'danger' {
  if (pct > 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
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

  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [showEmpty, setShowEmpty] = useState(false)

  const groups: Record<string, any[]> = {}
  if (summary) {
    for (const item of summary) {
      if (!groups[item.groupName]) groups[item.groupName] = []
      groups[item.groupName].push(item)
    }
  }

  const hasActivity = summary?.some((i: any) => i.plannedAmount > 0 || i.spentAmount > 0)

  const startEdit = (catId: string, current: number) => {
    setEditing(catId)
    setEditVal(String(current || ''))
  }

  const saveEdit = async (catId: string) => {
    const amount = parseFloat(editVal)
    if (!isNaN(amount) && amount >= 0) {
      await upsert.mutateAsync({ categoryId: catId, year, month, plannedAmount: amount })
    }
    setEditing(null)
  }

  const handleCopy = async () => {
    const result = await copy.mutateAsync({ year, month })
    setCopyMsg(result.copied > 0 ? `Copied ${result.copied} budgets from last month` : 'No budgets found in previous month')
    setTimeout(() => setCopyMsg(null), 3500)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-1">Budgets</h1>
        <div className="flex items-center gap-2">
          {copyMsg && (
            <span className="text-[12px] text-text-2 bg-surface-2 px-3 py-1.5 rounded-lg">{copyMsg}</span>
          )}
          <button
            onClick={handleCopy}
            disabled={copy.isPending}
            className="btn btn-ghost btn-sm"
          >
            {copy.isPending ? 'Copying...' : 'Copy from last month'}
          </button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="btn btn-ghost btn-sm p-2">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-[15px] font-semibold text-text-1 min-w-[130px] text-center">
          {format(current, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="btn btn-ghost btn-sm p-2">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {!hasActivity && (
            <div className="card p-6 text-center text-[13px] text-text-3">
              No budgets set for this month — click the pencil icon next to any category below to get started.
            </div>
          )}

          {Object.entries(groups).map(([groupName, items]) => {
            const visibleItems = showEmpty
              ? items
              : items.filter((i: any) => i.plannedAmount > 0 || i.spentAmount > 0)

            if (!showEmpty && visibleItems.length === 0) return null

            return (
              <div key={groupName} className="card p-5">
                <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wide mb-4">{groupName}</p>
                <div className="space-y-4">
                  {(showEmpty ? items : visibleItems).map((item: any) => {
                    const isUnbudgeted = item.plannedAmount === 0 && item.spentAmount === 0
                    return (
                      <div key={item.categoryId} className={isUnbudgeted ? 'opacity-40' : ''}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium text-text-1">{item.categoryName}</span>
                          <div className="flex items-center gap-2">
                            {editing === item.categoryId ? (
                              <>
                                <span className="text-[12px] text-text-3">$</span>
                                <input
                                  className="input text-[12px] w-24 py-1 px-2"
                                  value={editVal}
                                  onChange={(e) => setEditVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(item.categoryId)
                                    if (e.key === 'Escape') setEditing(null)
                                  }}
                                  autoFocus
                                />
                                <button onClick={() => saveEdit(item.categoryId)} className="text-success hover:opacity-80">
                                  <CheckIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditing(null)} className="text-text-3 hover:opacity-80">
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-[12px] text-text-2">
                                  {item.spentAmount > 0 || item.plannedAmount > 0
                                    ? <>{CAD.format(item.spentAmount)} / {item.plannedAmount > 0 ? CAD.format(item.plannedAmount) : '—'}</>
                                    : <span className="text-text-4">No budget</span>
                                  }
                                </span>
                                <button
                                  onClick={() => startEdit(item.categoryId, item.plannedAmount)}
                                  className="text-text-3 hover:text-text-1 transition-colors"
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        {item.plannedAmount > 0 ? (
                          <>
                            <ProgressBar value={item.percentUsed} color={progressColor(item.percentUsed)} height={6} />
                            {item.percentUsed > 80 && (
                              <p className={`text-[11px] mt-1 ${item.percentUsed > 100 ? 'text-danger' : 'text-warning'}`}>
                                {item.percentUsed > 100
                                  ? `Over budget by ${CAD.format(Math.abs(item.remaining))}`
                                  : `${CAD.format(item.remaining)} remaining`}
                              </p>
                            )}
                          </>
                        ) : item.spentAmount > 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-surface-3 rounded-full overflow-hidden" style={{ height: 6 }}>
                              <div className="h-full w-full bg-text-4 rounded-full opacity-40" />
                            </div>
                            <span className="text-[10px] text-text-4 whitespace-nowrap">No budget set</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Toggle to show/hide empty categories */}
          {summary && summary.length > 0 && (
            <button
              onClick={() => setShowEmpty((v) => !v)}
              className="text-[12px] text-text-3 hover:text-text-1 transition-colors w-full text-center py-1"
            >
              {showEmpty ? 'Hide unused categories' : 'Show all categories'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
