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
