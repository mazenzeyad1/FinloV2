import { configureApi, apiClient } from '@finlo/shared'
import { useAuthStore } from '../store/auth.store'
import { BASE_URL } from './config'

configureApi({
  baseUrl: BASE_URL,
  getToken: () => useAuthStore.getState().accessToken,
  // Identify as a native client so the backend returns the refresh token in the
  // response body (React Native has no cookie jar).
  getHeaders: () => ({ 'x-client': 'mobile' }),
  // On 401, attempt a refresh; the shared client retries the original request
  // once if this resolves true.
  onUnauthorized: () => useAuthStore.getState().refresh(),
})

export { apiClient as api }
