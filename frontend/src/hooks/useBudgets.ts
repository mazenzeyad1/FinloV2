import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useBudgetSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['budgets', 'summary', year, month],
    queryFn: () =>
      api.get('/budgets/summary', { params: { year, month } }).then((r) => r.data),
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      year,
      month,
      plannedAmount,
    }: {
      categoryId: string
      year: number
      month: number
      plannedAmount: number
    }) =>
      api
        .put(`/budgets/${categoryId}`, { plannedAmount }, { params: { year, month } })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useCopyBudgets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      api.post('/budgets/copy', { year, month }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
