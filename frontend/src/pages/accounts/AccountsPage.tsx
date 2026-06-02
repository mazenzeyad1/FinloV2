import { useState } from 'react'
import { useAccounts, useSyncAccounts } from '../../hooks/useAccounts'
import { useConnections, useDeleteConnection } from '../../hooks/useConnections'
import { PlaidLink } from '../../components/plaid/PlaidLink'
import { Badge } from '../../components/ui/Badge'
import {
  ArrowPathIcon,
  TrashIcon,
  BuildingLibraryIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const TYPE_ORDER = ['depository', 'credit', 'loan', 'investment', 'other']
const TYPE_LABEL: Record<string, string> = {
  depository: 'Depository',
  credit: 'Credit',
  loan: 'Loan',
  investment: 'Investment',
  other: 'Other',
}

export function AccountsPage() {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: connections, isLoading: loadingConns } = useConnections()
  const syncBalances = useSyncAccounts()
  const deleteConn = useDeleteConnection()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const accountsByConnection: Record<string, any[]> = {}
  if (accounts) {
    for (const a of accounts) {
      const cid = a.connectionId
      if (!accountsByConnection[cid]) accountsByConnection[cid] = []
      accountsByConnection[cid].push(a)
    }
  }

  const netWorth = accounts?.reduce((sum: number, a: any) => sum + (a.balance ?? 0), 0) ?? 0

  const handleDelete = (id: string) => {
    deleteConn.mutate(id, { onSuccess: () => setConfirmDeleteId(null) })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] font-semibold text-text-1">Accounts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => syncBalances.mutate()}
            disabled={syncBalances.isPending}
            className="btn btn-ghost btn-sm"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncBalances.isPending ? 'animate-spin' : ''}`} />
            {syncBalances.isPending ? 'Syncing...' : 'Sync balances'}
          </button>
          <PlaidLink />
        </div>
      </div>

      {/* Net worth summary */}
      {accounts && accounts.length > 0 && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-3 uppercase tracking-wider mb-0.5">Total balance</p>
            <p className="text-[28px] font-bold text-text-1 leading-none">{CAD.format(netWorth)}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(
              accounts.reduce((acc: Record<string, number>, a: any) => {
                const key = a.type === 'depository' ? 'Cash' : a.type === 'credit' ? 'Credit' : null
                if (key) acc[key] = (acc[key] ?? 0) + a.balance
                return acc
              }, {})
            ).map(([label, total]) => (
              <div key={label} className="text-right">
                <p className="text-[11px] text-text-3">{label}</p>
                <p className="text-[14px] font-semibold text-text-1">{CAD.format(total as number)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners */}
      {/* Content */}
      {loadingConns || loadingAccounts ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !connections || connections.length === 0 ? (
        <div className="card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BuildingLibraryIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-[14px] font-medium text-text-1 mb-1">No accounts connected</p>
          <p className="text-[13px] text-text-3 mb-4">Connect your bank to see your accounts and transactions</p>
          <PlaidLink />
        </div>
      ) : (
        connections.map((conn: any) => {
          const connAccounts = accountsByConnection[conn.id] ?? []
          const isInactive = conn.status !== 'ACTIVE'
          const lastSynced = connAccounts.reduce((latest: string | null, a: any) => {
            if (!latest || new Date(a.updatedAt) > new Date(latest)) return a.updatedAt
            return latest
          }, null) ?? conn.updatedAt

          // Group accounts by type
          const byType: Record<string, any[]> = {}
          for (const a of connAccounts) {
            const t = a.type ?? 'other'
            if (!byType[t]) byType[t] = []
            byType[t].push(a)
          }
          const sortedTypes = TYPE_ORDER.filter((t) => byType[t])

          return (
            <div key={conn.id} className={`card p-5 ${isInactive ? 'border border-danger/20' : ''}`}>
              {/* Connection header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-[13px] font-bold text-primary">
                    {(conn.institutionName ?? '?').charAt(0)}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-text-1">
                      {conn.institutionName ?? 'Connected Bank'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={isInactive ? 'danger' : 'success'}>
                        {conn.status.charAt(0) + conn.status.slice(1).toLowerCase()}
                      </Badge>
                      {lastSynced && (
                        <span className="text-[10px] text-text-4">Synced {timeAgo(lastSynced)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                {confirmDeleteId === conn.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-text-2">Disconnect?</span>
                    <button
                      onClick={() => handleDelete(conn.id)}
                      disabled={deleteConn.isPending}
                      className="text-[12px] font-medium text-danger hover:underline"
                    >
                      {deleteConn.isPending ? 'Removing...' : 'Yes, remove'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[12px] text-text-3 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(conn.id)}
                    className="text-text-3 hover:text-danger transition-colors p-1"
                    title="Disconnect"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inactive warning */}
              {isInactive && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-danger/5 border border-danger/15 rounded-lg px-3 py-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-danger flex-shrink-0" />
                    <p className="text-[12px] text-danger">This connection needs to be re-authenticated.</p>
                  </div>
                  <PlaidLink />
                </div>
              )}

              {/* Accounts grouped by type */}
              {connAccounts.length === 0 ? (
                <p className="text-[12px] text-text-3">No accounts found</p>
              ) : (
                <div className="space-y-4">
                  {sortedTypes.map((type) => {
                    const typeAccounts = byType[type]
                    const typeTotal = typeAccounts.reduce((s: number, a: any) => s + (a.balance ?? 0), 0)
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold text-text-4 uppercase tracking-wider">
                            {TYPE_LABEL[type] ?? type}
                          </p>
                          <p className="text-[11px] font-medium text-text-3">{CAD.format(typeTotal)}</p>
                        </div>
                        <div className="space-y-0">
                          {typeAccounts.map((a: any) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between py-2.5 border-b border-black/[0.04] last:border-0"
                            >
                              <div>
                                <p className="text-[13px] font-medium text-text-1">{a.name}</p>
                                <p className="text-[11px] text-text-3">
                                  {a.subtype
                                    ? a.subtype.charAt(0).toUpperCase() + a.subtype.slice(1)
                                    : a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                                  {a.mask && <span className="ml-1.5">···· {a.mask}</span>}
                                </p>
                              </div>
                              <p className="text-[18px] font-semibold text-text-1">{CAD.format(a.balance)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
