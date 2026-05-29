import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('finlo.auth')
  if (raw) {
    const { state } = JSON.parse(raw)
    if (state?.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const raw = localStorage.getItem('finlo.auth')
        if (!raw) return Promise.reject(err)
        const { state } = JSON.parse(raw)
        if (!state?.refreshToken) return Promise.reject(err)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken: state.refreshToken }
        )
        const stored = JSON.parse(localStorage.getItem('finlo.auth') || '{}')
        stored.state.accessToken = data.accessToken
        stored.state.refreshToken = data.refreshToken
        localStorage.setItem('finlo.auth', JSON.stringify(stored))
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('finlo.auth')
        window.location.href = '/login'
      }
    }

    // Handle standardized error format
    if (err.response?.data?.error) {
      const { error } = err.response.data
      const customError = new Error(error.message || 'An error occurred')
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
