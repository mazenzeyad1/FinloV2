import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { User } from '@finlo/shared'
import { BASE_URL } from '../lib/config'

const TOKEN_KEY = 'finlo_access_token'
const REFRESH_KEY = 'finlo_refresh_token'

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    // Treat as expired if less than 60 seconds remain
    return payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

/**
 * Exchange the stored refresh token for a fresh access (+ rotated refresh) token.
 * React Native has no cookie jar, so we send the refresh token in the body and
 * persist whatever the server rotates back. Returns the new access token or null.
 */
async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
    if (!refreshToken) return null

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client': 'mobile' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null

    const data = await res.json()
    if (!data.accessToken) return null

    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken)
    if (data.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

// Single in-flight refresh so concurrent 401s don't each rotate the refresh
// token and revoke one another.
let refreshing: Promise<string | null> | null = null
function refreshSingleFlight(): Promise<string | null> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => { refreshing = null })
  }
  return refreshing
}

interface AuthState {
  user: User | null
  accessToken: string | null
  initialized: boolean
  setTokens: (accessToken: string, refreshToken?: string) => Promise<void>
  setAccessToken: (token: string) => Promise<void>
  setUser: (user: User) => void
  logout: () => Promise<void>
  loadToken: () => Promise<void>
  /** Try to refresh the session. Returns true if recovered, false if logged out. */
  refresh: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  initialized: false,

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
    set({ accessToken })
  },

  setAccessToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    set({ accessToken: token })
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
    set({ user: null, accessToken: null })
  },

  refresh: async () => {
    const token = await refreshSingleFlight()
    if (token) {
      set({ accessToken: token })
      return true
    }
    await get().logout()
    return false
  },

  loadToken: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)

    if (!token) {
      set({ accessToken: null, initialized: true })
      return
    }

    if (!isJwtExpired(token)) {
      set({ accessToken: token, initialized: true })
      return
    }

    // Access token is stale — try a body-based refresh.
    const newToken = await refreshSingleFlight()
    if (newToken) {
      set({ accessToken: newToken, initialized: true })
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(REFRESH_KEY)
      set({ accessToken: null, initialized: true })
    }
  },
}))
