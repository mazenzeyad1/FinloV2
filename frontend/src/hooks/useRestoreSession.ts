import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function useRestoreSession() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setInitialized = useAuthStore((s) => s.setInitialized)

  useEffect(() => {
    axios
      .post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return axios.get(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          withCredentials: true,
        })
      })
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setInitialized())
  }, [])
}
