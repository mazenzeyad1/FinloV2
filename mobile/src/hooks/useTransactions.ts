import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Tx {
  id: string
  description: string
  merchantName: string | null
  amount: number
  date: string
  currency: string
  categoryId: string | null
  notes: string | null
  category: { id: string; name: string; groupName: string } | null
  account: { id: string; name: string; mask: string | null } | null
}

export interface TxPage {
  data: Tx[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface TxFilters {
  search?: string
  type?: 'income' | 'expense'
  from?: string
  to?: string
  accountId?: string
  sortBy?: 'date' | 'amount'
  sortDir?: 'asc' | 'desc'
  pageSize?: number
}

export interface Category {
  id: string
  name: string
  groupName: string
}

export function useTransactions(filters: TxFilters & { page?: number } = {}) {
  return useQuery<TxPage>({
    queryKey: ['transactions', filters],
    queryFn: () => api.get<TxPage>('/transactions', filters as Record<string, unknown>),
  })
}

export function useTransactionsInfinite(filters: TxFilters = {}) {
  return useInfiniteQuery<TxPage>({
    queryKey: ['transactions', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get<TxPage>('/transactions', {
        ...filters,
        page: pageParam,
        pageSize: filters.pageSize ?? 30,
      } as Record<string, unknown>),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
  })
}

export function useTransactionSummary(month: number, year: number) {
  return useQuery<{ income: number; expenses: number; net: number }>({
    queryKey: ['transactions', 'summary', month, year],
    queryFn: () =>
      api.get('/transactions/summary', { month, year } as Record<string, unknown>),
  })
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/transactions/categories'),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { categoryId?: string; notes?: string } }) =>
      api.patch(`/transactions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
