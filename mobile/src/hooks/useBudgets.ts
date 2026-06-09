import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface BudgetItem {
  categoryId: string
  categoryName: string
  groupName: string
  plannedAmount: number
  spentAmount: number
  percentUsed: number
  remaining: number
  isCustom?: boolean
}

export function useBudgetSummary(year: number, month: number) {
  return useQuery<BudgetItem[]>({
    queryKey: ['budgets', 'summary', year, month],
    queryFn: () => api.get<BudgetItem[]>('/budgets/summary', { year, month }),
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, year, month, plannedAmount }: {
      categoryId: string; year: number; month: number; plannedAmount: number
    }) =>
      api.put(`/budgets/${categoryId}`, { plannedAmount }, { year, month } as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useCopyBudgets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      api.post('/budgets/copy', { year, month }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
