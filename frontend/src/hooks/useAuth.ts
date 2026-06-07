import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const nav = useNavigate()
  return useMutation({
    mutationFn: (d: { email: string; password: string }) =>
      api.post('/auth/login', d).then((r) => r.data),
    onSuccess: async (data) => {
      setAccessToken(data.accessToken)
      const me = await api.get('/auth/me').then((r) => r.data)
      setUser(me)
      nav('/dashboard')
    },
  })
}

export function useRegister() {
  const nav = useNavigate()
  return useMutation({
    mutationFn: (d: { firstName: string; lastName: string; email: string; password: string }) =>
      api.post('/auth/register', d).then((r) => r.data),
    onSuccess: () => nav('/check-email'),
  })
}

export function useMe() {
  const token = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => { setUser(r.data); return r.data }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const nav = useNavigate()
  return () => {
    api.post('/auth/logout').finally(() => {
      logout()
      nav('/login')
    })
  }
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (d: { email: string }) =>
      api.post('/auth/forgot-password', d).then((r) => r.data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (d: { token: string; password: string }) =>
      api.post('/auth/reset-password', d).then((r) => r.data),
  })
}
