import Constants from 'expo-constants'

// Priority: explicit env var → auto-detected Metro host → fallback IP
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? '192.168.2.14'

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__
    ? `http://${devHost}:3000/api`
    : 'https://finlov2-1.onrender.com/api')
