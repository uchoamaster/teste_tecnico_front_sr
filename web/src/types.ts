export type OrderStatus = 'CRIADA' | 'PLANEJADA' | 'AGENDADA' | 'EM_TRANSPORTE' | 'ENTREGUE'

export type TransportType = {
  id: string
  name: string
  description?: string | null
}

export type Client = {
  id: string
  code: string
  name: string
  authorizedTransportTypes: Array<{
    transportTypeId: string
    transportType: TransportType
  }>
}

export type Item = {
  id: string
  sku: string
  name: string
  description?: string | null
  unitOfMeasure: string
}

export type AuditEvent = {
  id: string
  entityType: string
  entityId: string
  action: string
  previousState?: unknown
  nextState?: unknown
  createdAt: string
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type AuthenticatedUser = {
  id: string
  username: string
  displayName: string
  role: 'ADMIN' | 'OPERATOR'
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: AuthenticatedUser
}

export type SalesOrder = {
  id: string
  code: string
  status: OrderStatus
  deliveryDate?: string | null
  serviceWindowStart?: string | null
  serviceWindowEnd?: string | null
  schedulingConfirmed: boolean
  createdAt: string
  client: Client
  transportType: TransportType
  items: Array<{
    itemId: string
    quantity: number
    item: Item
  }>
  auditEvents: AuditEvent[]
}