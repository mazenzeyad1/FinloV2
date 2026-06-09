import { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, RefreshControl,
} from 'react-native'
import { useBudgetSummary, useUpsertBudget, useCopyBudgets, BudgetItem } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useTransactions'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
const CAD2 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

function addMonths(d: Date, n: number) {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

function barColor(pct: number, hasPlan: boolean) {
  if (!hasPlan) return '#334155'
  if (pct > 100) return '#ef4444'
  if (pct >= 80) return '#f59e0b'
  return '#22c55e'
}

function dotColor(pct: number, hasPlan: boolean) {
  if (!hasPlan) return '#334155'
  if (pct > 100) return '#ef4444'
  if (pct >= 80) return '#f59e0b'
  return '#22c55e'
}

export default function BudgetsScreen() {
  const [current, setCurrent] = useState(new Date())
  const month = current.getMonth() + 1
  const year = current.getFullYear()

  const { data: summary, isLoading, refetch, isRefetching } = useBudgetSummary(year, month)
  const upsert = useUpsertBudget()
  const copy = useCopyBudgets()
  const { data: allCategories } = useCategories()

  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const budgeted = useMemo(
    () => (summary ?? []).filter((i) => i.plannedAmount > 0 || i.categoryId === editing),
    [summary, editing],
  )

  const groups: Record<string, BudgetItem[]> = {}
  for (const item of budgeted) {
    if (!groups[item.groupName]) groups[item.groupName] = []
    groups[item.groupName].push(item)
  }

  const totalBudgeted = budgeted.reduce((s, i) => s + (i.plannedAmount ?? 0), 0)
  const totalSpent = budgeted.reduce((s, i) => s + (i.spentAmount ?? 0), 0)
  const safeToSpend = totalBudgeted - totalSpent
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  const now = new Date()
  const isCurrentMonth = current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth
  const perDay = safeToSpend > 0 ? safeToSpend / daysLeft : 0

  const hasBudgets = (summary ?? []).some((i) => i.plannedAmount > 0)

  const startEdit = (catId: string, planned: number) => {
    setEditing(catId)
    setEditVal(planned ? String(planned) : '')
    setShowPicker(false)
  }

  const saveEdit = async (catId: string) => {
    const trimmed = editVal.trim()
    const amount = trimmed === '' ? 0 : parseFloat(trimmed)
    if (!isNaN(amount) && amount >= 0) {
      try {
        await upsert.mutateAsync({ categoryId: catId, year, month, plannedAmount: amount })
      } catch {
        Alert.alert('Error', 'Could not save budget.')
      }
    }
    setEditing(null)
  }

  const removeBudget = async (catId: string) => {
    Alert.alert('Remove budget', 'Remove this budget for the month?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await upsert.mutateAsync({ categoryId: catId, year, month, plannedAmount: 0 })
          } catch {
            Alert.alert('Error', 'Could not remove budget.')
          }
          setEditing(null)
        },
      },
    ])
  }

  const handleCopy = async () => {
    try {
      const result: any = await copy.mutateAsync({ year, month })
      Alert.alert('Done', result?.copied > 0 ? `Copied ${result.copied} budgets from last month.` : 'No budgets found last month.')
    } catch {
      Alert.alert('Error', 'Could not copy budgets.')
    }
  }

  // Categories available to add (not yet budgeted)
  const available = useMemo(() => {
    const budgetedIds = new Set(budgeted.map(b => b.categoryId))
    const q = pickerSearch.trim().toLowerCase()
    return (summary ?? [])
      .filter(i => !budgetedIds.has(i.categoryId) || i.plannedAmount === 0)
      .filter(i => !q || i.categoryName.toLowerCase().includes(q) || i.groupName.toLowerCase().includes(q))
  }, [summary, budgeted, pickerSearch])

  if (showPicker) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={() => { setShowPicker(false); setPickerSearch('') }}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Add a budget</Text>
          <View style={{ width: 60 }} />
        </View>
        <TextInput
          style={styles.pickerSearch}
          placeholder="Search categories…"
          placeholderTextColor="#475569"
          value={pickerSearch}
          onChangeText={setPickerSearch}
          autoFocus
        />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {available.length === 0 ? (
            <Text style={styles.emptyText}>
              {pickerSearch ? 'No matching categories.' : 'All categories already have a budget.'}
            </Text>
          ) : (
            available.map(item => (
              <TouchableOpacity
                key={item.categoryId}
                style={styles.pickerRow}
                onPress={() => startEdit(item.categoryId, 0)}
              >
                <View>
                  <Text style={styles.pickerGroupLabel}>{item.groupName}</Text>
                  <Text style={styles.pickerCatName}>{item.categoryName}</Text>
                </View>
                {item.spentAmount > 0 && (
                  <Text style={styles.pickerSpent}>{CAD.format(item.spentAmount)} spent</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* Month nav */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Budgets</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrent(addMonths(current, -1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel(current)}</Text>
          <TouchableOpacity onPress={() => setCurrent(addMonths(current, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
      ) : !hasBudgets && editing === null ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.emptySub}>Add a budget for any category you want to keep an eye on.</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.primaryBtnText}>Add first budget</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleCopy} disabled={copy.isPending}>
              <Text style={styles.ghostBtnText}>{copy.isPending ? 'Copying…' : 'Copy last month'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Safe to spend hero */}
          {totalBudgeted > 0 && (
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.heroLabel}>
                    {isCurrentMonth ? 'Safe to spend' : 'Was left to spend'}
                  </Text>
                  <Text style={[styles.heroAmount, safeToSpend < 0 && styles.red]}>
                    {CAD2.format(Math.abs(safeToSpend))}
                    {safeToSpend < 0 && <Text style={styles.overText}> over</Text>}
                  </Text>
                  {isCurrentMonth && safeToSpend > 0 && (
                    <Text style={styles.perDay}>{CAD.format(perDay)}/day for {daysLeft} more day{daysLeft !== 1 ? 's' : ''}</Text>
                  )}
                </View>
                <View style={styles.heroRight}>
                  <Text style={styles.heroSpent}>{CAD2.format(totalSpent)} spent</Text>
                  <Text style={styles.heroBudgeted}>of {CAD2.format(totalBudgeted)}</Text>
                </View>
              </View>
              <View style={styles.overallTrack}>
                <View style={[styles.overallFill, {
                  width: `${Math.min(100, overallPct)}%` as any,
                  backgroundColor: barColor(overallPct, true),
                }]} />
              </View>
              <Text style={styles.overallPct}>{overallPct.toFixed(0)}% of budget used</Text>
            </View>
          )}

          {/* Category groups */}
          {Object.entries(groups).map(([groupName, items]) => (
            <View key={groupName} style={styles.card}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{groupName.toUpperCase()}</Text>
                <Text style={styles.groupTotal}>
                  {CAD.format(items.reduce((s, i) => s + i.spentAmount, 0))} / {CAD.format(items.reduce((s, i) => s + i.plannedAmount, 0))}
                </Text>
              </View>
              {items.map((item, idx) => {
                const pct = item.percentUsed ?? 0
                const hasPlan = item.plannedAmount > 0
                const isEditing = editing === item.categoryId
                return (
                  <View key={item.categoryId} style={[styles.catRow, idx > 0 && styles.catBorder]}>
                    <View style={styles.catTop}>
                      <View style={[styles.dot, { backgroundColor: dotColor(pct, hasPlan) }]} />
                      <View style={styles.catMid}>
                        <Text style={styles.catName}>{item.categoryName}</Text>
                        {hasPlan ? (
                          <Text style={styles.catSub}>
                            {CAD2.format(item.spentAmount)} spent ·{' '}
                            <Text style={item.remaining >= 0 ? styles.green : styles.red}>
                              {item.remaining >= 0
                                ? `${CAD2.format(item.remaining)} left`
                                : `${CAD2.format(Math.abs(item.remaining))} over`}
                            </Text>
                          </Text>
                        ) : (
                          <Text style={styles.catSubDim}>Enter a monthly amount →</Text>
                        )}
                      </View>
                      {isEditing ? (
                        <View style={styles.editRow}>
                          <TextInput
                            style={styles.editInput}
                            value={editVal}
                            onChangeText={setEditVal}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#475569"
                            autoFocus
                            onSubmitEditing={() => saveEdit(item.categoryId)}
                          />
                          <TouchableOpacity onPress={() => saveEdit(item.categoryId)} style={styles.editSave}>
                            <Text style={styles.editSaveText}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditing(null)} style={styles.editCancel}>
                            <Text style={styles.editCancelText}>✕</Text>
                          </TouchableOpacity>
                          {hasPlan && (
                            <TouchableOpacity onPress={() => removeBudget(item.categoryId)} style={styles.editDelete}>
                              <Text style={styles.editDeleteText}>🗑</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => startEdit(item.categoryId, item.plannedAmount)}
                          style={styles.editTrigger}
                        >
                          <Text style={styles.editTriggerText}>{CAD.format(item.plannedAmount)}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {hasPlan && (
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, {
                          width: `${Math.min(100, pct)}%` as any,
                          backgroundColor: barColor(pct, hasPlan),
                        }]} />
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ))}

          {/* Add / Copy */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.addBtnText}>+ Add budget</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} disabled={copy.isPending}>
              <Text style={styles.copyBtnText}>{copy.isPending ? 'Copying…' : 'Copy last month'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, padding: 4, gap: 4 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  navArrow: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  monthLabel: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', minWidth: 110, textAlign: 'center' },

  emptyCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyActions: { flexDirection: 'row', gap: 10 },
  primaryBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ghostBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' },
  ghostBtnText: { color: '#94a3b8', fontWeight: '500', fontSize: 14 },

  heroCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  heroAmount: { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
  overText: { fontSize: 16, fontWeight: '600' },
  red: { color: '#ef4444' },
  green: { color: '#22c55e' },
  perDay: { color: '#64748b', fontSize: 12, marginTop: 4 },
  heroRight: { alignItems: 'flex-end' },
  heroSpent: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  heroBudgeted: { color: '#64748b', fontSize: 12 },
  overallTrack: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  overallFill: { height: '100%', borderRadius: 4 },
  overallPct: { color: '#475569', fontSize: 11 },

  card: { backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1e293b', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
  groupLabel: { color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  groupTotal: { color: '#64748b', fontSize: 11 },

  catRow: { paddingHorizontal: 16, paddingVertical: 12 },
  catBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#334155' },
  catTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  catMid: { flex: 1 },
  catName: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  catSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
  catSubDim: { color: '#475569', fontSize: 11, marginTop: 2 },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editInput: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: '#f1f5f9', fontSize: 13, width: 72, borderWidth: 1, borderColor: '#6366f1' },
  editSave: { padding: 6 },
  editSaveText: { color: '#22c55e', fontSize: 16 },
  editCancel: { padding: 6 },
  editCancelText: { color: '#64748b', fontSize: 14 },
  editDelete: { padding: 6 },
  editDeleteText: { fontSize: 14 },
  editTrigger: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editTriggerText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },

  barTrack: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginTop: 10, marginLeft: 18 },
  barFill: { height: '100%', borderRadius: 3 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  addBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#334155', borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  copyBtn: { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  copyBtnText: { color: '#94a3b8', fontSize: 13 },

  // Picker
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  cancelBtn: { color: '#6366f1', fontSize: 15 },
  pickerTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  pickerSearch: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#f1f5f9', fontSize: 14 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1e293b' },
  pickerGroupLabel: { color: '#475569', fontSize: 11, marginBottom: 2 },
  pickerCatName: { color: '#f1f5f9', fontSize: 14 },
  pickerSpent: { color: '#64748b', fontSize: 12 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
})
