import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then((r) => r.data),
  })
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: () => api.post('/connections/link-token').then((r) => r.data),
  })
}

export function useExchangeToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (publicToken: string) =>
      api.post('/connections/exchange', { publicToken }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/connections/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
