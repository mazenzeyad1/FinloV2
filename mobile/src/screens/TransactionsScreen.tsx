import { useState, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, ActivityIndicator, Modal, ScrollView, RefreshControl, Alert,
} from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import {
  useTransactionsInfinite, useCategories, useUpdateTransaction, Tx,
} from '../hooks/useTransactions'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function fmtDate(iso: string) {
  return new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  })
}

function dateHeader(iso: string) {
  const d = new Date(iso.substring(0, 10) + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())
    return `Today · ${fmtDate(iso)}`
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday · ${fmtDate(iso)}`
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
}

function groupByDate(txs: Tx[]) {
  const map: Record<string, Tx[]> = {}
  for (const t of txs) {
    const key = t.date.substring(0, 10)
    if (!map[key]) map[key] = []
    map[key].push(t)
  }
  return Object.entries(map).map(([title, data]) => ({ title, data }))
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
] as const

export default function TransactionsScreen() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [showCatPicker, setShowCatPicker] = useState(false)

  const filters = useMemo(() => ({
    search: search || undefined,
    type: tab !== 'all' ? tab : undefined,
    sortBy: 'date' as const,
    sortDir: 'desc' as const,
  }), [search, tab])

  const {
    data, isLoading, isFetchingNextPage, hasNextPage,
    fetchNextPage, refetch, isRefetching,
  } = useTransactionsInfinite(filters)

  const { data: categories } = useCategories()
  const update = useUpdateTransaction()

  const allTxs = useMemo(() => data?.pages.flatMap(p => p.data) ?? [], [data])
  const sections = useMemo(() => groupByDate(allTxs), [allTxs])

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['transactions', 'infinite'] })
  }, [qc])

  const openDetail = (tx: Tx) => {
    setSelectedTx(tx)
    setEditNotes(tx.notes ?? '')
    setEditCategoryId(tx.categoryId ?? '')
  }

  const saveEdit = async () => {
    if (!selectedTx) return
    try {
      await update.mutateAsync({
        id: selectedTx.id,
        data: {
          notes: editNotes || undefined,
          categoryId: editCategoryId || undefined,
        },
      })
      setSelectedTx(null)
    } catch {
      Alert.alert('Error', 'Failed to save changes.')
    }
  }

  const selectedCat = categories?.find(c => c.id === editCategoryId)

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search transactions…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 48 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={t => t.id}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{dateHeader(section.title)}</Text>
            </View>
          )}
          renderItem={({ item: t, index, section }) => {
            const name = t.merchantName ?? t.description
            const isLast = index === section.data.length - 1
            return (
              <TouchableOpacity
                style={[styles.txRow, !isLast && styles.txBorder]}
                onPress={() => openDetail(t)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.txMid}>
                  <Text style={styles.txName} numberOfLines={1}>{name}</Text>
                  <View style={styles.txMeta}>
                    {t.category && <Text style={styles.badge}>{t.category.name}</Text>}
                    {t.account && (
                      <Text style={styles.txAccount}>{t.account.name}</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.txAmount, t.amount < 0 && styles.green]}>
                  {t.amount < 0 ? '+' : ''}{CAD.format(Math.abs(t.amount))}
                </Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No transactions found</Text>
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#6366f1" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}

      {/* Transaction detail sheet */}
      <Modal
        visible={!!selectedTx}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedTx(null)} />
          <View style={styles.sheet}>
            {selectedTx && (
              <>
                <View style={styles.sheetHandle} />

                <Text style={[styles.sheetAmount, selectedTx.amount < 0 && styles.green]}>
                  {selectedTx.amount < 0 ? '+' : ''}{CAD.format(Math.abs(selectedTx.amount))}
                </Text>
                <Text style={styles.sheetName}>
                  {selectedTx.merchantName ?? selectedTx.description}
                </Text>
                <Text style={styles.sheetDate}>{fmtDate(selectedTx.date)}</Text>

                <Text style={styles.fieldLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => setShowCatPicker(true)}
                >
                  <Text style={selectedCat ? styles.fieldValue : styles.fieldPlaceholder}>
                    {selectedCat
                      ? `${selectedCat.groupName} — ${selectedCat.name}`
                      : 'Uncategorized'}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add a note…"
                  placeholderTextColor="#475569"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveEdit}
                  disabled={update.isPending}
                >
                  <Text style={styles.saveBtnText}>
                    {update.isPending ? 'Saving…' : 'Save changes'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Category picker sheet */}
      <Modal
        visible={showCatPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCatPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCatPicker(false)} />
          <View style={[styles.sheet, styles.sheetTall]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerTitle}>Select category</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.catRow}
                onPress={() => { setEditCategoryId(''); setShowCatPicker(false) }}
              >
                <Text style={[styles.catName, !editCategoryId && styles.catSelected]}>
                  Uncategorized
                </Text>
              </TouchableOpacity>
              {categories?.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.catRow}
                  onPress={() => { setEditCategoryId(c.id); setShowCatPicker(false) }}
                >
                  <Text style={styles.catGroup}>{c.groupName}</Text>
                  <Text style={[styles.catName, editCategoryId === c.id && styles.catSelected]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  topBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 14,
    marginBottom: 12,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#1e293b',
  },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#fff' },

  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: '#0f172a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  sectionHeaderText: { color: '#475569', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#0f172a',
  },
  txBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1e293b' },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#312e81',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#a5b4fc', fontWeight: '700', fontSize: 14 },
  txMid: { flex: 1, marginRight: 10 },
  txName: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  badge: {
    backgroundColor: '#1e293b', color: '#94a3b8',
    fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  txAccount: { color: '#475569', fontSize: 11 },
  txAmount: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  green: { color: '#22c55e' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 14 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTall: { maxHeight: '70%' },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetAmount: { color: '#f1f5f9', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  sheetName: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 4 },
  sheetDate: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 2, marginBottom: 24 },

  fieldLabel: { color: '#64748b', fontSize: 12, fontWeight: '500', marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 16,
  },
  fieldValue: { color: '#f1f5f9', fontSize: 14 },
  fieldPlaceholder: { color: '#475569', fontSize: 14 },
  chevron: { color: '#475569', fontSize: 20 },
  notesInput: {
    backgroundColor: '#0f172a', borderRadius: 10,
    padding: 14, color: '#f1f5f9', fontSize: 14,
    marginBottom: 20, textAlignVertical: 'top', minHeight: 80,
  },
  saveBtn: {
    backgroundColor: '#6366f1', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  pickerTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  catRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  catGroup: { color: '#475569', fontSize: 11, marginBottom: 2 },
  catName: { color: '#94a3b8', fontSize: 14 },
  catSelected: { color: '#818cf8', fontWeight: '600' },
})
