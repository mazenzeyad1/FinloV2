type TokenGetter = () => string | null
type OnUnauthorized = () => void

let _baseUrl = 'http://localhost:3000/api'
let _getToken: TokenGetter = () => null
let _onUnauthorized: OnUnauthorized = () => {}

export function configureApi(opts: {
  baseUrl: string
  getToken: TokenGetter
  onUnauthorized: OnUnauthorized
}) {
  _baseUrl = opts.baseUrl
  _getToken = opts.getToken
  _onUnauthorized = opts.onUnauthorized
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, unknown>,
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    _onUnauthorized()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data?.error?.message || 'Request failed') as any
    err.code = data?.error?.code
    err.status = res.status
    throw err
  }

  const text = await res.text()
  return text ? JSON.parse(text) : undefined
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
