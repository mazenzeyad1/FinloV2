import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const QK = ['household'] as const

export function useHousehold() {
  return useQuery({
    queryKey: QK,
    queryFn: () => api.get('/household').then((r) => r.data),
    retry: false, // 404 means "not in a household" — don't spam retries
  })
}

export function useCreateHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name?: string) => api.post('/household', { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.post('/household/invite', { email }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => api.get(`/household/accept?token=${token}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/household/members/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useLeaveHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/household/leave').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useHouseholdAccounts() {
  return useQuery({
    queryKey: [...QK, 'accounts'],
    queryFn: () => api.get('/household/accounts').then((r) => r.data),
  })
}

export function useHouseholdTransactions(params?: {
  page?: number
  pageSize?: number
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: [...QK, 'transactions', params],
    queryFn: () => api.get('/household/transactions', { params }).then((r) => r.data),
  })
}

export function useHouseholdBudgetSummary() {
  return useQuery({
    queryKey: [...QK, 'budgets'],
    queryFn: () => api.get('/household/budgets/summary').then((r) => r.data),
  })
}
