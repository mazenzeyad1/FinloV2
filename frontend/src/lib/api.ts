import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Single shared promise while a refresh is in-flight so concurrent 401s
// don't each fire their own /refresh and race-revoke each other's tokens.
let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshing) {
          refreshing = axios
            .post<{ accessToken: string }>(`${BASE}/auth/refresh`, {}, { withCredentials: true })
            .then(({ data }) => {
              useAuthStore.getState().setAccessToken(data.accessToken)
              return data.accessToken
            })
            .finally(() => { refreshing = null })
        }
        const accessToken = await refreshing
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    if (err.response?.data?.error) {
      const { error } = err.response.data
      const customError = new Error(error.message || 'An error occurred') as any
      customError.code = error.code
      customError.details = error.details
      customError.timestamp = error.timestamp
      customError.path = error.path
      customError.method = error.method
      return Promise.reject(customError)
    }

    return Promise.reject(err)
  }
)
