import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data),
  })
}

export function useSetPrimaryAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) => api.patch(`/accounts/${accountId}/set-primary`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useSyncAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/accounts/sync').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useNetWorthHistory(months = 12) {
  return useQuery({
    queryKey: ['accounts', 'net-worth-history', months],
    queryFn: () =>
      api.get('/accounts/net-worth-history', { params: { months } }).then(
        (r) => r.data as { year: number; month: number; netWorth: number }[]
      ),
  })
}
