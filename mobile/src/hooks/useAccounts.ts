import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Account {
  id: string
  name: string
  type: string
  subtype: string | null
  balance: number
  currency: string
  mask: string | null
  isPrimary: boolean
  connectionId: string
  updatedAt: string
  connection: { id: string; institutionName: string | null; status: string }
}

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts'),
  })
}

export function useSyncAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ synced: number; errors: any[] }>('/accounts/sync'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
