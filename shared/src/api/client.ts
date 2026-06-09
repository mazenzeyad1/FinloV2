type TokenGetter = () => string | null
type HeadersGetter = () => Record<string, string>
/** Return true if the session was recovered (e.g. token refreshed) so the
 *  original request can be retried, false otherwise. */
type OnUnauthorized = () => Promise<boolean> | boolean

let _baseUrl = 'http://localhost:3000/api'
let _getToken: TokenGetter = () => null
let _getHeaders: HeadersGetter = () => ({})
let _onUnauthorized: OnUnauthorized = () => false

export function configureApi(opts: {
  baseUrl: string
  getToken: TokenGetter
  onUnauthorized: OnUnauthorized
  getHeaders?: HeadersGetter
}) {
  _baseUrl = opts.baseUrl
  _getToken = opts.getToken
  _onUnauthorized = opts.onUnauthorized
  if (opts.getHeaders) _getHeaders = opts.getHeaders
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, unknown>,
  isRetry = false,
): Promise<T> {
  let url = `${_baseUrl}${path}`

  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (query) url += `?${query}`
  }

  const token = _getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ..._getHeaders(),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    // Don't try to refresh on the auth endpoints themselves — a failed login
    // legitimately returns 401 and must not trigger a refresh loop.
    const isAuthPath = path.startsWith('/auth/')
    if (!isRetry && !isAuthPath) {
      const recovered = await _onUnauthorized()
      if (recovered) return request<T>(method, path, body, params, true)
    }
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data?.error?.message || data?.message || 'Request failed') as any
    err.code = data?.error?.code
    err.status = res.status
    throw err
  }

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown, params?: Record<string, unknown>) =>
    request<T>('PUT', path, body, params),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
