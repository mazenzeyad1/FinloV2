import Constants from 'expo-constants'

// In dev: auto-detect the Metro server host (works for LAN and tunnel).
// In prod: point at the real backend.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? '192.168.2.14'

export const BASE_URL = __DEV__
  ? `http://${devHost}:3000/api`
  : 'https://finlo-backend.onrender.com/api'
