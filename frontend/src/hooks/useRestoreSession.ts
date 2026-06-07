import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'
import { API_BASE } from '../lib/api'

export function useRestoreSession() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setInitialized = useAuthStore((s) => s.setInitialized)

  useEffect(() => {
    axios
      .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          withCredentials: true,
        })
      })
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setInitialized())
  }, [])
}
