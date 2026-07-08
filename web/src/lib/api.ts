import type {
  AuditEvent,
  AuthResponse,
  AuthenticatedUser,
  Client,
  Item,
  PaginatedResponse,
  SalesOrder,
  TransportType,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const ACCESS_TOKEN_KEY = 'ovgs-access-token'
const REFRESH_TOKEN_KEY = 'ovgs-refresh-token'

let accessToken = typeof window !== 'undefined' ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null
let refreshToken = typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string) {
  accessToken = token
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function setRefreshToken(token: string) {
  refreshToken = token
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function setSession(tokens: { accessToken: string; refreshToken: string }) {
  setAccessToken(tokens.accessToken)
  setRefreshToken(tokens.refreshToken)
}

export function clearAccessToken() {
  accessToken = null
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function clearRefreshToken() {
  refreshToken = null
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearSession() {
  clearAccessToken()
  clearRefreshToken()
}

export function getStoredAccessToken() {
  return accessToken
}

export function getStoredRefreshToken() {
  return refreshToken
}

async function tryRefreshToken() {
  if (!refreshToken) {
    return null
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearSession()
          return null
        }

        const payload = (await response.json()) as AuthResponse
        setSession({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        })
        return payload.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function request<T>(path: string, init?: RequestInit, retryOnUnauthorized = true): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...init,
  })

  if (response.status === 401 && retryOnUnauthorized && !path.startsWith('/auth/')) {
    const refreshedAccessToken = await tryRefreshToken()

    if (refreshedAccessToken) {
      return request<T>(path, init, false)
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; statusCode?: number } | null
    const error = new Error(payload?.error ?? 'Falha ao processar a requisição.') as Error & { statusCode?: number }
    error.statusCode = payload?.statusCode ?? response.status
    throw error
  }

  return response.json() as Promise<T>
}

export const api = {
  login: (body: { username: string; password: string }) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: (token: string) => request<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: token }) }, false),
  getMe: () => request<AuthenticatedUser>('/auth/me'),
  logout: () => request<{ success: true }>('/auth/logout', { method: 'POST' }, false),
  getClients: (page = 1, pageSize = 100) => request<PaginatedResponse<Client>>(`/clients?page=${page}&pageSize=${pageSize}`),
  createClient: (body: { name: string; code: string; authorizedTransportTypeIds: string[] }) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(body) }),
  getTransportTypes: (page = 1, pageSize = 100) => request<PaginatedResponse<TransportType>>(`/transport-types?page=${page}&pageSize=${pageSize}`),
  createTransportType: (body: { name: string; description: string }) => request<TransportType>('/transport-types', { method: 'POST', body: JSON.stringify(body) }),
  getItems: (page = 1, pageSize = 100) => request<PaginatedResponse<Item>>(`/items?page=${page}&pageSize=${pageSize}`),
  createItem: (body: { sku: string; name: string; description: string; unitOfMeasure: string }) => request<Item>('/items', { method: 'POST', body: JSON.stringify(body) }),
  getSalesOrders: (params: Record<string, string>) => request<PaginatedResponse<SalesOrder>>(`/sales-orders?${new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()}`),
  createSalesOrder: (body: { clientId: string; transportTypeId: string; items: Array<{ itemId: string; quantity: number }> }) => request<SalesOrder>('/sales-orders', { method: 'POST', body: JSON.stringify(body) }),
  updateSalesOrderStatus: (id: string, status: string) => request<SalesOrder>(`/sales-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  manageScheduling: (id: string, body: { deliveryDate: string; serviceWindowStart: string; serviceWindowEnd: string; confirm: boolean }) => request<SalesOrder>(`/sales-orders/${id}/scheduling`, { method: 'PUT', body: JSON.stringify(body) }),
  changeTransport: (id: string, transportTypeId: string) => request<SalesOrder>(`/sales-orders/${id}/transport`, { method: 'PATCH', body: JSON.stringify({ transportTypeId }) }),
  getAuditEvents: (page = 1, pageSize = 12) => request<PaginatedResponse<AuditEvent>>(`/audit-events?page=${page}&pageSize=${pageSize}`),
}