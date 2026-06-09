import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useAccounts, useSyncAccounts } from '../hooks/useAccounts'

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

const TYPE_ORDER = ['depository', 'credit', 'loan', 'investment', 'other']
const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash & Savings',
  credit: 'Credit Cards',
  loan: 'Loans',
  investment: 'Investments',
  other: 'Other',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AccountsScreen() {
  const { data: accounts, isLoading, isRefetching, refetch } = useAccounts()
  const sync = useSyncAccounts()

  const LIABILITY_TYPES = ['credit', 'loan']
  const netWorth = accounts?.reduce((s, a) => {
    const balance = a.balance ?? 0
    return s + (LIABILITY_TYPES.includes(a.type) ? -balance : balance)
  }, 0) ?? 0

  // Group accounts by connectionId
  const byConnection: Record<string, typeof accounts> = {}
  if (accounts) {
    for (const a of accounts) {
      if (!byConnection[a.connectionId]) byConnection[a.connectionId] = []
      byConnection[a.connectionId]!.push(a)
    }
  }

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync()
      if (result.errors?.length) {
        Alert.alert('Sync partial', `${result.synced} synced, ${result.errors.length} failed.`)
      }
    } catch {
      Alert.alert('Sync failed', 'Could not sync balances. Try again.')
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
      }
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity
          style={[styles.syncBtn, sync.isPending && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={sync.isPending}
        >
          <Text style={styles.syncBtnText}>
            {sync.isPending ? 'Syncing…' : '↻  Sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Net worth card */}
      {accounts && accounts.length > 0 && (
        <View style={styles.netCard}>
          <Text style={styles.netLabel}>Total balance</Text>
          <Text style={styles.netValue}>{CAD.format(netWorth)}</Text>
        </View>
      )}

      {/* Empty state */}
      {!accounts || accounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🏦</Text>
          <Text style={styles.emptyTitle}>No accounts connected</Text>
          <Text style={styles.emptySub}>Connect your bank on the web app to get started</Text>
        </View>
      ) : (
        Object.entries(byConnection).map(([connId, connAccounts]) => {
          const conn = connAccounts![0].connection
          const isInactive = conn.status !== 'ACTIVE'
          const lastSynced = connAccounts!.reduce((latest, a) =>
            !latest || new Date(a.updatedAt) > new Date(latest) ? a.updatedAt : latest
          , '' as string)

          // Group by type within connection
          const byType: Record<string, typeof connAccounts> = {}
          for (const a of connAccounts!) {
            const t = a.type ?? 'other'
            if (!byType[t]) byType[t] = []
            byType[t]!.push(a)
          }
          const sortedTypes = TYPE_ORDER.filter(t => byType[t])

          return (
            <View key={connId} style={[styles.connCard, isInactive && styles.connCardInactive]}>
              {/* Institution header */}
              <View style={styles.connHeader}>
                <View style={styles.connIcon}>
                  <Text style={styles.connIconText}>
                    {(conn.institutionName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connName}>
                    {conn.institutionName ?? 'Connected Bank'}
                  </Text>
                  <View style={styles.connMeta}>
                    <View style={[styles.statusDot, isInactive ? styles.dotRed : styles.dotGreen]} />
                    <Text style={styles.connStatus}>
                      {isInactive ? 'Needs re-auth' : 'Active'}
                    </Text>
                    {lastSynced && (
                      <Text style={styles.connSynced}>· Synced {timeAgo(lastSynced)}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Accounts by type */}
              {sortedTypes.map(type => {
                const typeAccounts = byType[type]!
                const typeTotal = typeAccounts.reduce((s, a) => s + a.balance, 0)
                return (
                  <View key={type} style={styles.typeSection}>
                    <View style={styles.typeHeader}>
                      <Text style={styles.typeLabel}>{TYPE_LABEL[type] ?? type}</Text>
                      <Text style={styles.typeTotal}>{CAD.format(typeTotal)}</Text>
                    </View>
                    {typeAccounts.map((a, i) => (
                      <View
                        key={a.id}
                        style={[styles.accountRow, i < typeAccounts.length - 1 && styles.accountBorder]}
                      >
                        <View>
                          <Text style={styles.accountName}>{a.name}</Text>
                          <Text style={styles.accountSub}>
                            {a.subtype
                              ? a.subtype.charAt(0).toUpperCase() + a.subtype.slice(1)
                              : a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                            {a.mask && <Text>  ···· {a.mask}</Text>}
                          </Text>
                        </View>
                        <Text style={styles.accountBalance}>{CAD.format(a.balance)}</Text>
                      </View>
                    ))}
                  </View>
                )
              })}
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  syncBtn: {
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  netCard: {
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 20, marginBottom: 16,
  },
  netLabel: { color: '#64748b', fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  netValue: { color: '#f1f5f9', fontSize: 32, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 32, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  connCard: {
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, marginBottom: 14,
  },
  connCardInactive: { borderWidth: 1, borderColor: '#7f1d1d' },
  connHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  connIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#312e81',
    alignItems: 'center', justifyContent: 'center',
  },
  connIconText: { color: '#a5b4fc', fontWeight: '700', fontSize: 16 },
  connName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  connMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotRed: { backgroundColor: '#ef4444' },
  connStatus: { color: '#64748b', fontSize: 12 },
  connSynced: { color: '#475569', fontSize: 11 },

  typeSection: { marginBottom: 12 },
  typeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeLabel: { color: '#475569', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeTotal: { color: '#64748b', fontSize: 12, fontWeight: '500' },

  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  accountBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
  accountName: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  accountSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  accountBalance: { color: '#f1f5f9', fontSize: 18, fontWeight: '600' },
})
