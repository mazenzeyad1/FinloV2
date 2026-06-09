import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert, RefreshControl,
} from 'react-native'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useContributeToGoal } from '../hooks/useGoals'
import { Goal } from '@finlo/shared'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function daysLeft(dateStr: string) {
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

function monthsLeft(dateStr: string) {
  const target = new Date(dateStr)
  const now = new Date()
  return (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function projection(goal: Goal): string | null {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const reached = goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0
  if (reached) return '🎉 Goal reached!'
  if (!goal.targetDate) return `${CAD.format(remaining)} to go`
  const days = daysLeft(goal.targetDate)
  const months = monthsLeft(goal.targetDate)
  if (days < 0) return `${CAD.format(remaining)} to go · target date passed`
  if (months >= 1) return `Save ${CAD.format(remaining / months)}/mo to reach by ${fmtDate(goal.targetDate)}`
  return `${CAD.format(remaining)} to go · by ${fmtDate(goal.targetDate)}`
}

export default function GoalsScreen() {
  const { data: goals, isLoading, refetch, isRefetching } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const contribute = useContributeToGoal()

  const [showCreate, setShowCreate] = useState(false)
  const [showContribute, setShowContribute] = useState<Goal | null>(null)
  const [showEdit, setShowEdit] = useState<Goal | null>(null)

  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newDate, setNewDate] = useState('')

  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editDate, setEditDate] = useState('')

  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')

  const openEdit = (g: Goal) => {
    setShowEdit(g)
    setEditName(g.name)
    setEditEmoji(g.emoji ?? '')
    setEditTarget(String(g.targetAmount))
    setEditDate(g.targetDate ? g.targetDate.substring(0, 10) : '')
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newTarget) return
    try {
      await createGoal.mutateAsync({
        name: newName.trim(), emoji: newEmoji || undefined,
        targetAmount: parseFloat(newTarget),
        targetDate: newDate || undefined,
      })
      setShowCreate(false)
      setNewName(''); setNewEmoji(''); setNewTarget(''); setNewDate('')
    } catch {
      Alert.alert('Error', 'Could not create goal.')
    }
  }

  const handleEdit = async () => {
    if (!showEdit) return
    try {
      await updateGoal.mutateAsync({
        id: showEdit.id,
        data: { name: editName, emoji: editEmoji || undefined, targetAmount: parseFloat(editTarget), targetDate: editDate || undefined },
      })
      setShowEdit(null)
    } catch {
      Alert.alert('Error', 'Could not update goal.')
    }
  }

  const handleContribute = async () => {
    if (!showContribute || !contribAmount) return
    try {
      await contribute.mutateAsync({ id: showContribute.id, amount: parseFloat(contribAmount), note: contribNote || undefined })
      setShowContribute(null)
      setContribAmount(''); setContribNote('')
    } catch {
      Alert.alert('Error', 'Could not add funds.')
    }
  }

  const handleDelete = (goal: Goal) => {
    Alert.alert('Delete goal', `Delete "${goal.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal.mutate(goal.id) },
    ])
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Goals</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.newBtnText}>+ New goal</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        ) : goals?.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏁</Text>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySub}>Set a savings goal and track your progress.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.primaryBtnText}>Create your first goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals?.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
            const reached = goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0
            const proj = projection(goal)
            return (
              <View key={goal.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    {goal.emoji ? <Text style={styles.emoji}>{goal.emoji}</Text> : null}
                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      {goal.targetDate && (
                        <Text style={styles.goalDate}>Target: {fmtDate(goal.targetDate)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(goal)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(goal)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.currentAmount}>{CAD.format(goal.currentAmount)}</Text>
                  <Text style={styles.targetAmount}>{CAD.format(goal.targetAmount)}</Text>
                </View>

                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: reached ? '#22c55e' : '#6366f1' }]} />
                </View>

                <View style={styles.projRow}>
                  <Text style={styles.pctText}>{pct.toFixed(0)}% complete</Text>
                  {proj && <Text style={[styles.projText, reached && styles.greenText]}>{proj}</Text>}
                </View>

                <TouchableOpacity
                  style={styles.addFundsBtn}
                  onPress={() => { setShowContribute(goal); setContribAmount(''); setContribNote('') }}
                >
                  <Text style={styles.addFundsBtnText}>Add funds</Text>
                </TouchableOpacity>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New goal</Text>
            <Text style={styles.fieldLabel}>Goal name</Text>
            <TextInput style={styles.input} placeholder="e.g. Emergency fund" placeholderTextColor="#475569" value={newName} onChangeText={setNewName} />
            <Text style={styles.fieldLabel}>Emoji (optional)</Text>
            <TextInput style={styles.input} placeholder="🏠" placeholderTextColor="#475569" value={newEmoji} onChangeText={setNewEmoji} maxLength={2} />
            <Text style={styles.fieldLabel}>Target amount ($)</Text>
            <TextInput style={styles.input} placeholder="5000" placeholderTextColor="#475569" value={newTarget} onChangeText={setNewTarget} keyboardType="decimal-pad" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={createGoal.isPending}>
              <Text style={styles.saveBtnText}>{createGoal.isPending ? 'Creating…' : 'Create goal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowEdit(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit goal</Text>
            <Text style={styles.fieldLabel}>Goal name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#475569" />
            <Text style={styles.fieldLabel}>Emoji</Text>
            <TextInput style={styles.input} value={editEmoji} onChangeText={setEditEmoji} maxLength={2} placeholderTextColor="#475569" />
            <Text style={styles.fieldLabel}>Target amount ($)</Text>
            <TextInput style={styles.input} value={editTarget} onChangeText={setEditTarget} keyboardType="decimal-pad" placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleEdit} disabled={updateGoal.isPending}>
              <Text style={styles.saveBtnText}>{updateGoal.isPending ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contribute modal */}
      <Modal visible={!!showContribute} animationType="slide" transparent onRequestClose={() => setShowContribute(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowContribute(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add funds — {showContribute?.name}</Text>
            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput style={styles.input} placeholder="100" placeholderTextColor="#475569" value={contribAmount} onChangeText={setContribAmount} keyboardType="decimal-pad" autoFocus />
            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput style={styles.input} placeholder="Monthly deposit" placeholderTextColor="#475569" value={contribNote} onChangeText={setContribNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleContribute} disabled={contribute.isPending}>
              <Text style={styles.saveBtnText}>{contribute.isPending ? 'Adding…' : 'Add funds'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  newBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  emptyCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 28, alignItems: 'center', marginTop: 8 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  primaryBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  emoji: { fontSize: 26 },
  cardTitleBlock: { flex: 1 },
  goalName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  goalDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  iconBtnText: { fontSize: 16 },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  currentAmount: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  targetAmount: { color: '#64748b', fontSize: 14 },

  barTrack: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 4 },

  projRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pctText: { color: '#64748b', fontSize: 11 },
  projText: { color: '#94a3b8', fontSize: 11, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  greenText: { color: '#22c55e' },

  addFundsBtn: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, alignItems: 'center' },
  addFundsBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 14 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { color: '#64748b', fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 16 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
