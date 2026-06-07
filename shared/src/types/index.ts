export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isVerified: boolean
}

export interface Account {
  id: string
  name: string
  type: string
  subtype: string
  balance: number
  currency: string
  isPrimary: boolean
  institutionName: string
}

export interface Transaction {
  id: string
  accountId: string
  amount: number
  currency: string
  date: string
  name: string
  merchantName?: string
  categoryId?: string
  category?: Category
  type: 'income' | 'expense'
  notes?: string
}

export interface Category {
  id: string
  name: string
  groupName: string
}

export interface TransactionFilters {
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

export interface Goal {
  id: string
  name: string
  emoji?: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  createdAt: string
}

export interface Budget {
  categoryId: string
  categoryName: string
  plannedAmount: number
  spentAmount: number
  year: number
  month: number
}
