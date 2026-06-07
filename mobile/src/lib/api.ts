import { configureApi, apiClient } from '@finlo/shared'
import { useAuthStore } from '../store/auth.store'
import { BASE_URL } from './config'

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.accessToken) {
      await useAuthStore.getState().setAccessToken(data.accessToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

configureApi({
  baseUrl: BASE_URL,
  getToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: async () => {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      await useAuthStore.getState().logout()
    }
  },
})

export { apiClient as api }
export { tryRefresh }
