import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useTransfers() {
  return useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/transfers').then((r) => r.data),
  })
}

export function useSendMoney() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { recipientEmail: string; amount: number; memo?: string }) =>
      api.post('/transfers/send', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  })
}
