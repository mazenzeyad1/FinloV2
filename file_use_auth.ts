import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

export function useLogin() {
  const { setTokens, setUser } = useAuthStore()
  const nav = useNavigate()
  return useMutation({
    mutationFn: (d: { email: string; password: string }) =>
      api.post('/auth/login', d).then((r) => r.data),
    onSuccess: async (data) => {
      setTokens(data.accessToken, data.refreshToken)
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
  return () => { logout(); nav('/login') }
}
