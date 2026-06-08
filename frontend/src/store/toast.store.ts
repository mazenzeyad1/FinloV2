import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: ToastType) => void
  remove: (id: number) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = ++counter
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Fire a toast from anywhere (components or callbacks) without a hook. */
export const toast = {
  success: (m: string) => useToastStore.getState().add(m, 'success'),
  error: (m: string) => useToastStore.getState().add(m, 'error'),
  info: (m: string) => useToastStore.getState().add(m, 'info'),
}
