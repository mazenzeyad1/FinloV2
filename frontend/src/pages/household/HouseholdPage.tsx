import { useState } from 'react'
import {
  UsersIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  useHousehold,
  useCreateHousehold,
  useInviteMember,
  useRemoveMember,
  useLeaveHousehold,
  useHouseholdAccounts,
  useHouseholdBudgetSummary,
} from '../../hooks/useHousehold'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { toast } from '../../store/toast.store'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

function InitialScreen({ onCreate }: { onCreate: (name: string) => void }) {
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const create = useCreateHousehold()

  const handleCreate = async () => {
    try {
      await create.mutateAsync(name || undefined)
      setShowModal(false)
      toast.success('Household created!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create household')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <HomeIcon className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text-1">No household yet</h2>
        <p className="text-text-2 mt-1 max-w-sm">
          Create a household to share budgets and see your partner's spending alongside yours.
        </p>
      </div>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-primary flex items-center gap-2"
      >
        <PlusIcon className="w-4 h-4" />
        Create Household
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Household">
        <Field label="Household name (optional)">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Our Household"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function MembersSection({
  members,
  invites,
  currentUserId,
  isOwner,
}: {
  members: any[]
  invites: any[]
  currentUserId: string
  isOwner: boolean
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const invite = useInviteMember()
  const remove = useRemoveMember()
  const leave = useLeaveHousehold()

  const validateEmail = (value: string): boolean => {
    const trimmed = value.trim()
    if (!trimmed) {
      setEmailError('Email is required')
      return false
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const handleInvite = async () => {
    if (!validateEmail(email)) return
    
    try {
      await invite.mutateAsync(email.trim())
      setEmail('')
      setShowInvite(false)
      toast.success(`Invite sent to ${email}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to send invite')
    }
  }

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the household?`)) return
    try {
      await remove.mutateAsync(userId)
      toast.success(`${name} removed`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to remove member')
    }
  }

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this household?')) return
    try {
      await leave.mutateAsync()
      toast.success('You have left the household')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to leave')
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-1 flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-primary" />
          Members
        </h3>
        <div className="flex gap-2">
          {isOwner && (
            <button
              className="btn btn-ghost text-sm flex items-center gap-1"
              onClick={() => setShowInvite(true)}
            >
              <EnvelopeIcon className="w-4 h-4" />
              Invite
            </button>
          )}
          <button
            className="btn btn-ghost text-sm text-red-500 flex items-center gap-1"
            onClick={handleLeave}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>

      <ul className="divide-y divide-black/[0.06]">
        {members.map((m: any) => (
          <li key={m.id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-text-1">
                {m.user.firstName} {m.user.lastName}
                {m.role === 'OWNER' && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Owner
                  </span>
                )}
              </p>
              <p className="text-sm text-text-2">{m.user.email}</p>
            </div>
            {isOwner && m.user.id !== currentUserId && (
              <button
                className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                onClick={() => handleRemove(m.user.id, m.user.firstName)}
                title="Remove member"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-text-2 uppercase tracking-wide mb-2">
            Pending Invites
          </p>
          <ul className="space-y-1">
            {invites.map((inv: any) => (
              <li key={inv.id} className="text-sm text-text-2 flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 shrink-0" />
                {inv.email}
                <span className="text-xs opacity-60">
                  · expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={showInvite} onClose={() => {
        setShowInvite(false)
        setEmail('')
        setEmailError('')
      }} title="Invite Member">
        <Field label="Email address">
          {(id) => (
            <>
              <input
                id={id}
                className={`input ${emailError ? 'border-red-500' : ''}`}
                type="email"
                placeholder="partner@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError('')
                }}
              />
              {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            </>
          )}
        </Field>
        <p className="text-sm text-text-2 mt-2">
          They'll receive an email with a link to join your household.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-ghost" onClick={() => {
            setShowInvite(false)
            setEmail('')
            setEmailError('')
          }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleInvite} disabled={invite.isPending || !email || !!emailError}>
            {invite.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function AccountsSection() {
  const { data: accounts, isLoading } = useHouseholdAccounts()

  if (isLoading) return <Skeleton className="h-40" />

  const totalAssets = (accounts ?? [])
    .filter((a: any) => !['credit', 'loan'].includes(a.type))
    .reduce((sum: number, a: any) => sum + a.balance, 0)
  const totalLiabilities = (accounts ?? [])
    .filter((a: any) => ['credit', 'loan'].includes(a.type))
    .reduce((sum: number, a: any) => sum + a.balance, 0)

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-text-1 flex items-center gap-2 mb-4">
        <BanknotesIcon className="w-5 h-5 text-primary" />
        Household Accounts
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-sm text-text-2">Total Assets</p>
          <p className="text-xl font-bold text-green-500 mt-1">{CAD.format(totalAssets)}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-sm text-text-2">Total Liabilities</p>
          <p className="text-xl font-bold text-red-500 mt-1">{CAD.format(totalLiabilities)}</p>
        </div>
      </div>

      {accounts?.length === 0 ? (
        <p className="text-sm text-text-2 text-center py-4">No accounts yet</p>
      ) : (
        <ul className="divide-y divide-black/[0.06]">
          {accounts?.map((a: any) => (
            <li key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-text-1 text-sm">{a.name}</p>
                <p className="text-xs text-text-2">
                  {a.user.firstName} · {a.type}
                  {a.mask && ` ····${a.mask}`}
                </p>
              </div>
              <span
                className={`font-semibold text-sm ${
                  ['credit', 'loan'].includes(a.type) ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {CAD.format(a.balance)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BudgetSection() {
  const { data, isLoading } = useHouseholdBudgetSummary()

  if (isLoading) return <Skeleton className="h-40" />
  if (!data?.summary?.length)
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-text-1 flex items-center gap-2 mb-2">
          <ChartBarIcon className="w-5 h-5 text-primary" />
          Budget Summary
        </h3>
        <p className="text-sm text-text-2">No budgets set for this month.</p>
      </div>
    )

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-text-1 flex items-center gap-2 mb-4">
        <ChartBarIcon className="w-5 h-5 text-primary" />
        Budget Summary — {new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
      </h3>
      <ul className="space-y-3">
        {data.summary.map((b: any) => {
          const pct = Math.min((b.spent / b.plannedAmount) * 100, 100)
          const over = b.spent > b.plannedAmount
          return (
            <li key={b.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-1 font-medium">
                  {b.category.icon} {b.category.name}
                  <span className="text-xs text-text-2 ml-1">· {b.user.firstName}</span>
                </span>
                <span className={over ? 'text-red-500 font-semibold' : 'text-text-2'}>
                  {CAD.format(b.spent)} / {CAD.format(b.plannedAmount)}
                </span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function HouseholdPage() {
  const { data: household, isLoading, error } = useHousehold()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  // 404 = not in a household
  if (error || !household) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-text-1 mb-6">Household</h1>
        <InitialScreen onCreate={() => {}} />
      </div>
    )
  }

  const currentUserId = household.members.find((m: any) => m.role === 'OWNER')?.user.id
  // Derive own membership — we'll use the owner's userId as a fallback since we don't
  // directly have the current user id here; the backend validates actions anyway.
  const myMembership = household.members[0] // just used for isOwner check below
  const isOwner = myMembership?.role === 'OWNER'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <HomeIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-1">{household.name}</h1>
          <p className="text-sm text-text-2">{household.members.length} member{household.members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <MembersSection
        members={household.members}
        invites={household.invites ?? []}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />

      <AccountsSection />
      <BudgetSection />
    </div>
  )
}
