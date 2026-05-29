import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface TransactionFilters {
  page?: number
  pageSize?: number
  search?: string
  from?: string
  to?: string
  accountId?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'all'
  minAmount?: number
  maxAmount?: number
  uncategorized?: boolean
  sortBy?: 'date' | 'amount'
  sortDir?: 'asc' | 'desc'
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      api.get('/transactions', { params: filters }).then((r) => ({
        data: r.data.data,
        meta: r.data.meta,
      })),
  })
}

export function useTransactionSummary(month: number, year: number) {
  return useQuery({
    queryKey: ['transactions', 'summary', month, year],
    queryFn: () =>
      api.get('/transactions/summary', { params: { month, year } }).then((r) => r.data),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { categoryId?: string; notes?: string } }) =>
      api.patch(`/transactions/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useBulkUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, categoryId }: { ids: string[]; categoryId: string }) =>
      api.post('/transactions/bulk-category', { ids, categoryId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
