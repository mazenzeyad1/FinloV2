import { useState } from 'react'
import { format } from 'date-fns'
import { PlusIcon, PencilIcon, TrashIcon, FlagIcon } from '@heroicons/react/24/outline'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useContributeToGoal } from '../../hooks/useGoals'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Modal } from '../../components/ui/Modal'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function progressColor(pct: number): 'success' | 'warning' | 'primary' {
  if (pct >= 100) return 'success'
  return 'primary'
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-3 animate-pulse rounded-lg ${className}`} />
}

export function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const contribute = useContributeToGoal()

  const [showCreate, setShowCreate] = useState(false)
  const [showContribute, setShowContribute] = useState<any>(null)
  const [showEdit, setShowEdit] = useState<any>(null)

  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newDate, setNewDate] = useState('')
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editDate, setEditDate] = useState('')

  const openEdit = (g: any) => {
    setShowEdit(g)
    setEditName(g.name)
    setEditEmoji(g.emoji ?? '')
    setEditTarget(String(g.targetAmount))
    setEditDate(g.targetDate ? format(new Date(g.targetDate), 'yyyy-MM-dd') : '')
  }

  const handleCreate = async () => {
    if (!newName || !newTarget) return
    await createGoal.mutateAsync({
      name: newName, emoji: newEmoji || undefined,
      targetAmount: parseFloat(newTarget),
      targetDate: newDate || undefined,
    })
    setShowCreate(false)
    setNewName(''); setNewEmoji(''); setNewTarget(''); setNewDate('')
  }

  const handleEdit = async () => {
    if (!showEdit) return
    await updateGoal.mutateAsync({
      id: showEdit.id,
      data: { name: editName, emoji: editEmoji || undefined, targetAmount: parseFloat(editTarget), targetDate: editDate || undefined },
    })
    setShowEdit(null)
  }

  const handleContribute = async () => {
    if (!showContribute || !contribAmount) return
    await contribute.mutateAsync({ id: showContribute.id, amount: parseFloat(contribAmount), note: contribNote || undefined })
    setShowContribute(null)
    setContribAmount(''); setContribNote('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-1">Goals</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          New goal
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : goals?.length === 0 ? (
        <div className="card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FlagIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-[14px] font-medium text-text-1 mb-1">No goals yet</p>
          <p className="text-[13px] text-text-3 mb-4">Set a savings goal and track your progress</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" /> Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {goals?.map((goal: any) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            return (
              <div key={goal.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {goal.emoji && <span className="text-[24px]">{goal.emoji}</span>}
                    <div>
                      <p className="text-[14px] font-semibold text-text-1">{goal.name}</p>
                      {goal.targetDate && (
                        <p className="text-[11px] text-text-3">Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="text-text-3 hover:text-text-1 transition-colors p-1">
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this goal?')) deleteGoal.mutate(goal.id) }}
                      className="text-text-3 hover:text-danger transition-colors p-1"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-[12px] text-text-2 mb-1.5">
                    <span>{CAD.format(goal.currentAmount)}</span>
                    <span>{CAD.format(goal.targetAmount)}</span>
                  </div>
                  <ProgressBar value={pct} color={progressColor(pct)} height={8} />
                  <p className="text-[11px] text-text-3 mt-1">{pct.toFixed(0)}% complete</p>
                </div>
                <button onClick={() => setShowContribute(goal)} className="btn btn-secondary btn-sm w-full">
                  Add funds
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New goal">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Goal name</label>
            <input className="input" placeholder="e.g. Emergency fund" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Emoji (optional)</label>
            <input className="input" placeholder="🏠" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Target amount ($)</label>
            <input type="number" className="input" placeholder="5000" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Target date (optional)</label>
            <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          {createGoal.isError && <p className="text-[12px] text-danger">Failed to create goal</p>}
          <button className="btn btn-primary w-full" onClick={handleCreate} disabled={createGoal.isPending}>
            {createGoal.isPending ? 'Creating...' : 'Create goal'}
          </button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit goal">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Goal name</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Emoji</label>
            <input className="input" value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} maxLength={2} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Target amount ($)</label>
            <input type="number" className="input" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Target date</label>
            <input type="date" className="input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" onClick={handleEdit} disabled={updateGoal.isPending}>
            {updateGoal.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </Modal>

      {/* Contribute modal */}
      <Modal open={!!showContribute} onClose={() => setShowContribute(null)} title={`Add funds — ${showContribute?.name}`}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Amount ($)</label>
            <input type="number" className="input" placeholder="100" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-text-3 font-medium mb-1 block">Note (optional)</label>
            <input className="input" placeholder="Monthly deposit" value={contribNote} onChange={(e) => setContribNote(e.target.value)} />
          </div>
          {contribute.isError && <p className="text-[12px] text-danger">Failed to add contribution</p>}
          <button className="btn btn-primary w-full" onClick={handleContribute} disabled={contribute.isPending}>
            {contribute.isPending ? 'Adding...' : 'Add funds'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
