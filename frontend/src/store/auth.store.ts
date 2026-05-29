import { create } from 'zustand'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isVerified: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  initialized: boolean
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  setInitialized: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setInitialized: () => set({ initialized: true }),
  logout: () => set({ user: null, accessToken: null }),
}))
