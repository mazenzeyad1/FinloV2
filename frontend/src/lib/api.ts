import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
        useAuthStore.getState().setAccessToken(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
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
