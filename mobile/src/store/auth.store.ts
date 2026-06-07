import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { User } from '@finlo/shared'
import { BASE_URL } from '../lib/config'

const TOKEN_KEY = 'finlo_access_token'

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    // Treat as expired if less than 60 seconds remain
    return payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

async function refreshTokenRequest(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.accessToken ?? null
  } catch {
    return null
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  initialized: boolean
  setAccessToken: (token: string) => Promise<void>
  setUser: (user: User) => void
  logout: () => Promise<void>
  loadToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  initialized: false,

  setAccessToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    set({ accessToken: token })
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    set({ user: null, accessToken: null })
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

    // Token is expired — try cookie-based refresh
    const newToken = await refreshTokenRequest()
    if (newToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken)
      set({ accessToken: newToken, initialized: true })
    } else {
      // Refresh failed — force re-login
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      set({ accessToken: null, initialized: true })
    }
  },
}))
