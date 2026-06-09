import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth.store'
import { useAccounts } from '../hooks/useAccounts'
import { useTransactions, useTransactionSummary } from '../hooks/useTransactions'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function nDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().substring(0, 10)
}

function fmtDate(iso: string) {
  return new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  })
}

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const now = new Date()
  const today = now.toISOString().substring(0, 10)
  const sevenDaysAgo = nDaysAgo(6)

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: summary, isLoading: loadingSummary } = useTransactionSummary(
    now.getMonth() + 1,
    now.getFullYear(),
  )
  const { data: recent, isLoading: loadingRecent } = useTransactions({
    pageSize: 5, sortBy: 'date', sortDir: 'desc',
  })
  const { data: weekData } = useTransactions({
    from: sevenDaysAgo, to: today, pageSize: 200,
  })

  const refreshing = loadingAccounts || loadingSummary || loadingRecent
  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  const LIABILITY_TYPES = ['credit', 'loan']
  const netWorth = accounts?.reduce((s, a) => {
    const balance = a.balance ?? 0
    return s + (LIABILITY_TYPES.includes(a.type) ? -balance : balance)
  }, 0) ?? 0
  const income = summary?.income ?? 0
  const expenses = summary?.expenses ?? 0
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

  // 7-day spending by day
  const chartDays = useMemo(() => {
    const days: { key: string; label: string; amount: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        key: d.toISOString().substring(0, 10),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
        amount: 0,
      })
    }
    if (weekData?.data) {
      for (const t of weekData.data) {
        if (t.amount > 0) {
          const key = t.date.substring(0, 10)
          const day = days.find(d => d.key === key)
          if (day) day.amount += t.amount
        }
      }
    }
    return days
  }, [weekData])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {user?.firstName ?? 'there'} 👋</Text>
        <Text style={styles.sub}>Here's your overview</Text>
      </View>

      {/* 2×2 metric grid — two explicit rows to avoid flexWrap overflow */}
      <View style={styles.row}>
        <Tile label="Net Worth" value={CAD.format(netWorth)} loading={loadingAccounts} accent />
        <Tile label="Savings rate" value={`${savingsRate.toFixed(1)}%`} loading={loadingSummary} />
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <Tile label="Income (mo)" value={CAD.format(income)} loading={loadingSummary} />
        <Tile label="Spend (mo)" value={CAD.format(expenses)} loading={loadingSummary} />
      </View>

      {/* 7-day spending chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending — last 7 days</Text>
        <SpendingBars days={chartDays} />
      </View>

      {/* Recent transactions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent transactions</Text>
        {loadingRecent ? (
          <ActivityIndicator color="#6366f1" style={{ marginVertical: 16 }} />
        ) : !recent?.data?.length ? (
          <Text style={styles.empty}>No transactions yet — connect a bank first</Text>
        ) : (
          recent.data.map((t, i) => {
            const name = t.merchantName ?? t.description
            return (
              <View
                key={t.id}
                style={[styles.txRow, i < recent.data.length - 1 && styles.txBorder]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.txMid}>
                  <Text style={styles.txName} numberOfLines={1}>{name}</Text>
                  {t.category && <Text style={styles.txCat}>{t.category.name}</Text>}
                </View>
                <View>
                  <Text style={[styles.txAmount, t.amount < 0 && styles.green]}>
                    {t.amount < 0 ? '+' : ''}{CAD.format(Math.abs(t.amount))}
                  </Text>
                  <Text style={styles.txDate}>{fmtDate(t.date)}</Text>
                </View>
              </View>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

function Tile({ label, value, loading, accent }: {
  label: string; value: string; loading?: boolean; accent?: boolean
}) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      {loading ? (
        <ActivityIndicator color={accent ? '#fff' : '#6366f1'} size="small" />
      ) : (
        <Text
          style={[styles.tileValue, accent && styles.tileValueAccent]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
      )}
      <Text style={[styles.tileLabel, accent && styles.tileLabelAccent]}>{label}</Text>
    </View>
  )
}

function SpendingBars({ days }: { days: { label: string; amount: number }[] }) {
  const max = Math.max(...days.map(d => d.amount), 0.01)
  return (
    <View style={styles.bars}>
      {days.map(d => (
        <View key={d.key ?? d.label} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                { height: `${Math.max((d.amount / max) * 100, d.amount > 0 ? 6 : 0)}%` },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  greeting: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  sub: { color: '#64748b', fontSize: 14, marginTop: 2 },

  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
  },
  tileAccent: { backgroundColor: '#6366f1' },
  tileValue: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tileValueAccent: { color: '#fff' },
  tileLabel: { color: '#64748b', fontSize: 12 },
  tileLabelAccent: { color: 'rgba(255,255,255,0.7)' },

  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginTop: 16 },
  cardTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '600', marginBottom: 14 },
  empty: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  // Bar chart
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  barLabel: { color: '#475569', fontSize: 10, marginTop: 6 },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
  avatar: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#312e81',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#a5b4fc', fontWeight: '700', fontSize: 14 },
  txMid: { flex: 1, marginRight: 8 },
  txName: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  txCat: { color: '#64748b', fontSize: 11, marginTop: 2 },
  txAmount: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  txDate: { color: '#64748b', fontSize: 11, textAlign: 'right', marginTop: 1 },
  green: { color: '#22c55e' },
})
