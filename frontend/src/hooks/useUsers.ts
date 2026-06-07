import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

export function useUpdateProfile() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string }) =>
      api.patch('/users/me', data).then((r) => r.data),
    onSuccess: (user) => {
      setUser(user)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/users/change-password', data).then((r) => r.data),
  })
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: (data: { newEmail: string; currentPassword: string }) =>
      api.post('/users/change-email', data).then((r) => r.data),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (data: { password: string }) =>
      api.delete('/users/me', { data }).then((r) => r.data),
  })
}
