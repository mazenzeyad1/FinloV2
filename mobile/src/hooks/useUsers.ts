import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { User } from '@finlo/shared'
import { useAuthStore } from '../store/auth.store'

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string }) =>
      api.patch<User>('/users/me', data),
    onSuccess: (user) => setUser(user),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/users/change-password', data),
  })
}
