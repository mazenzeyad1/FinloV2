import { useState } from 'react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { useTransfers, useSendMoney } from '../../hooks/useTransfers'
import { useAuthStore } from '../../store/auth.store'
import { ArrowUpRightIcon, ArrowDownLeftIcon } from '@heroicons/react/24/outline'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })
const QUICK_AMOUNTS = [20, 50, 100, 200]

type Filter = 'all' | 'sent' | 'received'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true })
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-semibold text-primary flex-shrink-0">
      {initials}
    </div>
  )
}

export function TransferPage() {
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('50')
  const [memo, setMemo] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')

  const { data: transfers, isLoading } = useTransfers()
  const sendMoney = useSendMoney()
  const user = useAuthStore((state) => state.user)

  const handleSend = async () => {
    setError('')
    if (!email || !amount) { setError('Email and amount are required'); return }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount'); return }
    try {
      await sendMoney.mutateAsync({ recipientEmail: email, amount: parsed, memo: memo || undefined })
      setEmail(''); setMemo(''); setAmount('50')
      setTab('history')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send')
    }
  }

  const filtered = transfers?.filter((t: any) => {
    if (filter === 'sent') return t.sender?.id === user?.id
    if (filter === 'received') return t.recipient?.id === user?.id
    return true
  })

  const sentTotal = transfers?.filter((t: any) => t.sender?.id === user?.id && t.status === 'COMPLETED')
    .reduce((s: number, t: any) => s + t.amount, 0) ?? 0
  const receivedTotal = transfers?.filter((t: any) => t.recipient?.id === user?.id && t.status === 'COMPLETED')
    .reduce((s: number, t: any) => s + t.amount, 0) ?? 0

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-[22px] font-semibold text-text-1">Transfer</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit">
        {(['send', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            className={`px-5 py-1.5 rounded-[8px] text-[13px] font-medium transition-all
              ${tab === t ? 'bg-white text-text-1 shadow-sm' : 'text-text-2 hover:text-text-1'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div className="card p-6 space-y-5">
          {/* Amount */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[28px] font-semibold text-text-3">$</span>
              <input
                type="number"
                className="text-[48px] font-semibold text-text-1 bg-transparent border-0 outline-none text-center w-40"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className={`btn btn-sm ${amount === String(a) ? 'btn-primary' : 'btn-ghost'}`}
                >
                  ${a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1.5 block">Recipient email</label>
            <input
              className="input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1.5 block">Memo (optional)</label>
            <input
              className="input"
              placeholder="What's it for?"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleSend}
            disabled={sendMoney.isPending}
          >
            {sendMoney.isPending ? 'Processing...' : 'Send money →'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {/* Summary row */}
          {!isLoading && transfers && transfers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card px-4 py-3">
                <p className="text-[11px] text-text-3 mb-0.5">Total sent</p>
                <p className="text-[18px] font-semibold text-danger">−{CAD.format(sentTotal)}</p>
              </div>
              <div className="card px-4 py-3">
                <p className="text-[11px] text-text-3 mb-0.5">Total received</p>
                <p className="text-[18px] font-semibold text-success">+{CAD.format(receivedTotal)}</p>
              </div>
            </div>
          )}

          {/* Filter pills */}
          <div className="flex gap-1.5">
            {(['all', 'sent', 'received'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all border
                  ${filter === f
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-text-3 border-black/10 hover:border-black/20'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="card divide-y divide-black/[0.04]">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-text-3">No transfers yet</div>
            ) : (
              filtered.map((t: any) => {
                const isSent = t.sender?.id === user?.id
                const counterparty = isSent ? t.recipient : t.sender
                const counterpartyName = `${counterparty?.firstName ?? ''} ${counterparty?.lastName ?? ''}`.trim() || counterparty?.email

                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="relative">
                      <Avatar name={counterpartyName} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center
                        ${isSent ? 'bg-danger/10' : 'bg-success/10'}`}>
                        {isSent
                          ? <ArrowUpRightIcon className="w-2.5 h-2.5 text-danger" />
                          : <ArrowDownLeftIcon className="w-2.5 h-2.5 text-success" />
                        }
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-1 truncate">
                        {isSent ? `To ${counterpartyName}` : `From ${counterpartyName}`}
                      </p>
                      {t.memo
                        ? <p className="text-[12px] text-text-3 truncate">{t.memo}</p>
                        : <p className="text-[12px] text-text-4">{isSent ? 'Sent' : 'Received'}</p>
                      }
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-[14px] font-semibold ${isSent ? 'text-danger' : 'text-success'}`}>
                        {isSent ? '−' : '+'}{CAD.format(t.amount)}
                      </p>
                      <p className="text-[11px] text-text-4">{formatDate(t.createdAt)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
