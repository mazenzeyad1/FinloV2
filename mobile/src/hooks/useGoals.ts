import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Goal } from '@finlo/shared'

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals'),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; emoji?: string; targetAmount: number; targetDate?: string }) =>
      api.post<Goal>('/goals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; emoji: string; targetAmount: number; targetDate: string }> }) =>
      api.patch<Goal>(`/goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useContributeToGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      api.post(`/goals/${id}/contribute`, { amount, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
