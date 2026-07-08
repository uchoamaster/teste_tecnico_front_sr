import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { api, clearSession, getStoredAccessToken, getStoredRefreshToken, setSession } from './lib/api'
import type { AuditEvent, AuthenticatedUser, Client, Item, OrderStatus, SalesOrder, TransportType } from './types'

const ORDER_FLOW: OrderStatus[] = ['CRIADA', 'PLANEJADA', 'AGENDADA', 'EM_TRANSPORTE', 'ENTREGUE']

type TabKey = 'overview' | 'orders' | 'masters' | 'audit'

const emptySchedule = {
  deliveryDate: '',
  serviceWindowStart: '08:00',
  serviceWindowEnd: '12:00',
  confirm: false,
}

function getNextStatus(status: OrderStatus) {
  const index = ORDER_FLOW.indexOf(status)
  return ORDER_FLOW[index + 1] ?? null
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sem data definida'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'Admin@123' })
  const [clients, setClients] = useState<Client[]>([])
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [clientsMeta, setClientsMeta] = useState({ page: 1, pageSize: 5, total: 0, totalPages: 1 })
  const [transportMeta, setTransportMeta] = useState({ page: 1, pageSize: 5, total: 0, totalPages: 1 })
  const [itemsMeta, setItemsMeta] = useState({ page: 1, pageSize: 5, total: 0, totalPages: 1 })
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, pageSize: 6, total: 0, totalPages: 1 })
  const [auditMeta, setAuditMeta] = useState({ page: 1, pageSize: 8, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [clientForm, setClientForm] = useState({ name: '', code: '', authorizedTransportTypeIds: [] as string[] })
  const [transportForm, setTransportForm] = useState({ name: '', description: '' })
  const [itemForm, setItemForm] = useState({ sku: '', name: '', description: '', unitOfMeasure: '' })
  const [orderForm, setOrderForm] = useState({
    clientId: '',
    transportTypeId: '',
    items: [{ itemId: '', quantity: 1 }],
  })
  const [orderFilters, setOrderFilters] = useState({
    status: '',
    clientId: '',
    transportTypeId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })
  const [scheduleForms, setScheduleForms] = useState<Record<string, typeof emptySchedule>>({})
  const [transportSelections, setTransportSelections] = useState<Record<string, string>>({})
  const deferredSearch = useDeferredValue(orderFilters.search)
  const isAdmin = currentUser?.role === 'ADMIN'

  const refreshReferenceData = async () => {
    const [clientsResponse, transportResponse, itemsResponse] = await Promise.all([
      api.getClients(clientsMeta.page, clientsMeta.pageSize),
      api.getTransportTypes(transportMeta.page, transportMeta.pageSize),
      api.getItems(itemsMeta.page, itemsMeta.pageSize),
    ])

    setClients(clientsResponse.data)
    setTransportTypes(transportResponse.data)
    setItems(itemsResponse.data)
    setClientsMeta(clientsResponse.meta)
    setTransportMeta(transportResponse.meta)
    setItemsMeta(itemsResponse.meta)
  }

  const refreshOrders = async () => {
    const ordersResponse = await api.getSalesOrders({
      status: orderFilters.status,
      clientId: orderFilters.clientId,
      transportTypeId: orderFilters.transportTypeId,
      dateFrom: orderFilters.dateFrom,
      dateTo: orderFilters.dateTo,
      page: String(ordersMeta.page),
      pageSize: String(ordersMeta.pageSize),
    })

    setOrders(ordersResponse.data)
    setOrdersMeta(ordersResponse.meta)
  }

  const refreshAudit = async () => {
    const response = await api.getAuditEvents(auditMeta.page, auditMeta.pageSize)
    setAuditEvents(response.data)
    setAuditMeta(response.meta)
  }

  const refreshAll = async () => {
    setLoading(true)
    try {
      await Promise.all([refreshReferenceData(), refreshOrders(), refreshAudit()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      const token = getStoredAccessToken()

      if (!token) {
        setAuthLoading(false)
        setLoading(false)
        return
      }

      try {
        const me = await api.getMe()
        setCurrentUser(me)
        await refreshAll()
      } catch {
        const storedRefreshToken = getStoredRefreshToken()

        if (storedRefreshToken) {
          try {
            const refreshed = await api.refresh(storedRefreshToken)
            setSession({
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
            })
            setCurrentUser(refreshed.user)
            await refreshAll()
            setAuthLoading(false)
            return
          } catch {
            clearSession()
          }
        }

        setCurrentUser(null)
        setLoading(false)
      } finally {
        setAuthLoading(false)
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    void refreshOrders()
  }, [orderFilters.status, orderFilters.clientId, orderFilters.transportTypeId, orderFilters.dateFrom, orderFilters.dateTo, ordersMeta.page, ordersMeta.pageSize])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    void refreshAudit()
  }, [auditMeta.page, auditMeta.pageSize])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    void refreshReferenceData()
  }, [clientsMeta.page, clientsMeta.pageSize, transportMeta.page, transportMeta.pageSize, itemsMeta.page, itemsMeta.pageSize])

  const visibleOrders = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    if (!query) {
      return orders
    }

    return orders.filter((order) => [order.code, order.client.name, order.transportType.name].join(' ').toLowerCase().includes(query))
  }, [deferredSearch, orders])

  const kpis = useMemo(() => {
    return {
      totalOrders: orders.length,
      delivered: orders.filter((order) => order.status === 'ENTREGUE').length,
      transport: orders.filter((order) => order.status === 'EM_TRANSPORTE').length,
      scheduled: orders.filter((order) => order.status === 'AGENDADA').length,
    }
  }, [orders])

  const availableTransportsForSelectedClient = useMemo(() => {
    const client = clients.find((entry) => entry.id === orderForm.clientId)
    return client ? client.authorizedTransportTypes.map((entry) => entry.transportType) : transportTypes
  }, [clients, orderForm.clientId, transportTypes])

  async function runAction(actionKey: string, task: () => Promise<void>) {
    setBusyAction(actionKey)
    setFeedback(null)

    try {
      await task()
      setFeedback({ tone: 'success', message: 'Operação realizada com sucesso.' })
    } catch (error) {
      if (typeof error === 'object' && error && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 401) {
        resetLocalSession()
      }
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Falha inesperada.' })
    } finally {
      setBusyAction(null)
    }
  }

  function reloadData() {
    startTransition(() => {
      void Promise.all([refreshReferenceData(), refreshOrders(), refreshAudit()])
    })
  }

  function changeOrdersPage(nextPage: number) {
    setOrdersMeta((current) => ({ ...current, page: nextPage }))
  }

  function changeAuditPage(nextPage: number) {
    setAuditMeta((current) => ({ ...current, page: nextPage }))
  }

  function changeClientsPage(nextPage: number) {
    setClientsMeta((current) => ({ ...current, page: nextPage }))
  }

  function changeTransportPage(nextPage: number) {
    setTransportMeta((current) => ({ ...current, page: nextPage }))
  }

  function changeItemsPage(nextPage: number) {
    setItemsMeta((current) => ({ ...current, page: nextPage }))
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const username = loginForm.username.trim().toLowerCase()
    const password = loginForm.password.trim()

    if (!username || !password) {
      setFeedback({ tone: 'error', message: 'Informe usuário e senha.' })
      return
    }

    void runAction('login', async () => {
      clearSession()
      const response = await api.login({ username, password })
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      })
      setCurrentUser(response.user)
      await refreshAll()
    })
  }

  function resetLocalSession() {
    clearSession()
    setCurrentUser(null)
    setClients([])
    setTransportTypes([])
    setItems([])
    setOrders([])
    setAuditEvents([])
  }

  function handleLogout() {
    void runAction('logout', async () => {
      try {
        await api.logout()
      } finally {
        resetLocalSession()
      }
    })
  }

  function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientForm.name || !clientForm.code) {
      setFeedback({ tone: 'error', message: 'Preencha nome e código do cliente.' })
      return
    }

    void runAction('create-client', async () => {
      await api.createClient(clientForm)
      setClientForm({ name: '', code: '', authorizedTransportTypeIds: [] })
      reloadData()
    })
  }

  function handleCreateTransportType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transportForm.name) {
      setFeedback({ tone: 'error', message: 'Informe o nome do tipo de transporte.' })
      return
    }

    void runAction('create-transport', async () => {
      await api.createTransportType(transportForm)
      setTransportForm({ name: '', description: '' })
      reloadData()
    })
  }

  function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!itemForm.sku || !itemForm.name || !itemForm.unitOfMeasure) {
      setFeedback({ tone: 'error', message: 'SKU, nome e unidade são obrigatórios.' })
      return
    }

    void runAction('create-item', async () => {
      await api.createItem(itemForm)
      setItemForm({ sku: '', name: '', description: '', unitOfMeasure: '' })
      reloadData()
    })
  }

  function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!orderForm.clientId || !orderForm.transportTypeId) {
      setFeedback({ tone: 'error', message: 'Selecione cliente e transporte para a OV.' })
      return
    }
    if (orderForm.items.some((entry) => !entry.itemId || entry.quantity < 1)) {
      setFeedback({ tone: 'error', message: 'Defina ao menos um item válido para a OV.' })
      return
    }

    void runAction('create-order', async () => {
      await api.createSalesOrder(orderForm)
      setOrderForm({ clientId: '', transportTypeId: '', items: [{ itemId: '', quantity: 1 }] })
      reloadData()
    })
  }

  function handleOrderStatusUpdate(order: SalesOrder) {
    const nextStatus = getNextStatus(order.status)
    if (!nextStatus) {
      return
    }

    void runAction(`status-${order.id}`, async () => {
      await api.updateSalesOrderStatus(order.id, nextStatus)
      reloadData()
    })
  }

  function handleScheduling(orderId: string) {
    const form = scheduleForms[orderId] ?? emptySchedule
    if (!form.deliveryDate) {
      setFeedback({ tone: 'error', message: 'Defina a data de entrega antes de agendar.' })
      return
    }

    void runAction(`schedule-${orderId}`, async () => {
      await api.manageScheduling(orderId, form)
      reloadData()
    })
  }

  function handleTransportChange(orderId: string) {
    const transportTypeId = transportSelections[orderId]
    if (!transportTypeId) {
      setFeedback({ tone: 'error', message: 'Selecione o novo tipo de transporte.' })
      return
    }

    void runAction(`transport-${orderId}`, async () => {
      await api.changeTransport(orderId, transportTypeId)
      reloadData()
    })
  }

  if (authLoading) {
    return <div className="shell"><main className="content"><div className="panel">Validando sessão...</div></main></div>
  }

  if (!currentUser) {
    return (
      <div className="login-shell">
        <section className="login-panel">
          <p className="eyebrow">OVGS Access</p>
          <h1>Entrar na central operacional</h1>
          <p className="intro dark">Use os usuários do seed para acessar a plataforma.</p>
          {feedback ? <div className={`feedback ${feedback.tone}`}>{feedback.message}</div> : null}
          <form className="login-form" onSubmit={handleLogin}>
            <input placeholder="Usuário" value={loginForm.username} onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))} />
            <input type="password" placeholder="Senha" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
            <button disabled={busyAction === 'login'} type="submit">Entrar</button>
          </form>
          <div className="credentials-hint">
            <span>Admin: admin / Admin@123</span>
            <span>Operador: operator / Operator@123</span>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="eyebrow">Desafio Técnico</p>
        <h1>OVGS</h1>
        <p className="intro">Plataforma única para cadastros, gestão operacional, agendamento e trilha de auditoria de ordens de venda.</p>
        <nav className="nav">
          {[
            ['overview', 'Visão Geral'],
            ['orders', 'Ordens & Agendamento'],
            ['masters', 'Cadastros Base'],
            ['audit', 'Auditoria'],
          ].map(([key, label]) => (
            <button key={key} type="button" className={activeTab === key ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(key as TabKey)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{currentUser.displayName}</span>
          <span>{currentUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
          <span>API REST + NestJS</span>
          <span>Postgres + Prisma</span>
          <button type="button" className="ghost-button" onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <main className="content">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">Centro Operacional</p>
            <h2>Controle do ciclo de vida das ordens</h2>
          </div>
          <button type="button" className="ghost-button" onClick={() => void refreshAll()}>
            Atualizar dados
          </button>
        </header>

        {feedback ? <div className={`feedback ${feedback.tone}`}>{feedback.message}</div> : null}
        {loading ? <div className="panel">Carregando ambiente operacional...</div> : null}

        {!loading && activeTab === 'overview' ? (
          <section className="tab-grid">
            <div className="kpi-grid">
              <article className="kpi-card accent"><span>Total de OVs</span><strong>{kpis.totalOrders}</strong><p>Volume sob gestão na plataforma.</p></article>
              <article className="kpi-card"><span>Agendadas</span><strong>{kpis.scheduled}</strong><p>Ordens com data e janela confirmadas.</p></article>
              <article className="kpi-card"><span>Em Transporte</span><strong>{kpis.transport}</strong><p>Carga em execução logística.</p></article>
              <article className="kpi-card"><span>Entregues</span><strong>{kpis.delivered}</strong><p>Ordens finalizadas sem pendência.</p></article>
            </div>
            <section className="panel split-panel">
              <div>
                <p className="section-label">Clientes habilitados</p>
                <ul className="clean-list">
                  {clients.map((client) => (
                    <li key={client.id}>
                      <strong>{client.name}</strong>
                      <span>{client.code}</span>
                      <small>{client.authorizedTransportTypes.map((entry) => entry.transportType.name).join(', ') || 'Sem restrições'}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="section-label">Últimos eventos</p>
                <ul className="timeline">
                  {auditEvents.slice(0, 6).map((event) => (
                    <li key={event.id}>
                      <strong>{event.action}</strong>
                      <span>{event.entityType}</span>
                      <small>{formatDate(event.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </section>
        ) : null}

        {!loading && activeTab === 'masters' ? (
          <section className="tab-grid three-up">
            <section className="panel form-panel">
              <div className="panel-header"><h3>Tipos de Transporte</h3><p>Cadastro expansível sem alterar regras existentes.</p></div>
              {isAdmin ? (
                <form className="inline-form" onSubmit={handleCreateTransportType}>
                  <input placeholder="Nome da modalidade" value={transportForm.name} onChange={(event) => setTransportForm((current) => ({ ...current, name: event.target.value }))} />
                  <textarea placeholder="Descrição" value={transportForm.description} onChange={(event) => setTransportForm((current) => ({ ...current, description: event.target.value }))} />
                  <button disabled={busyAction === 'create-transport'} type="submit">Salvar transporte</button>
                </form>
              ) : <p className="role-note">Somente administradores podem criar ou editar tipos de transporte.</p>}
              <ul className="clean-list master-list">{transportTypes.map((transportType) => <li key={transportType.id}><strong>{transportType.name}</strong><span>{transportType.description || 'Sem descrição'}</span></li>)}</ul>
              <div className="pager compact-pager"><button type="button" className="ghost-button" disabled={transportMeta.page <= 1} onClick={() => changeTransportPage(transportMeta.page - 1)}>Anterior</button><span>{transportMeta.page}/{transportMeta.totalPages}</span><button type="button" className="ghost-button" disabled={transportMeta.page >= transportMeta.totalPages} onClick={() => changeTransportPage(transportMeta.page + 1)}>Próxima</button></div>
            </section>
            <section className="panel form-panel">
              <div className="panel-header"><h3>Clientes</h3><p>Vincule transportes autorizados por cliente.</p></div>
              {isAdmin ? (
                <form className="inline-form" onSubmit={handleCreateClient}>
                  <input placeholder="Nome do cliente" value={clientForm.name} onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))} />
                  <input placeholder="Código do cliente" value={clientForm.code} onChange={(event) => setClientForm((current) => ({ ...current, code: event.target.value }))} />
                  <select multiple value={clientForm.authorizedTransportTypeIds} onChange={(event) => setClientForm((current) => ({ ...current, authorizedTransportTypeIds: Array.from(event.target.selectedOptions).map((option) => option.value) }))}>
                    {transportTypes.map((transportType) => <option key={transportType.id} value={transportType.id}>{transportType.name}</option>)}
                  </select>
                  <button disabled={busyAction === 'create-client'} type="submit">Salvar cliente</button>
                </form>
              ) : <p className="role-note">Somente administradores podem criar ou editar clientes.</p>}
              <ul className="clean-list master-list">{clients.map((client) => <li key={client.id}><strong>{client.name}</strong><span>{client.code}</span><small>{client.authorizedTransportTypes.map((entry) => entry.transportType.name).join(', ') || 'Sem transportes autorizados'}</small></li>)}</ul>
              <div className="pager compact-pager"><button type="button" className="ghost-button" disabled={clientsMeta.page <= 1} onClick={() => changeClientsPage(clientsMeta.page - 1)}>Anterior</button><span>{clientsMeta.page}/{clientsMeta.totalPages}</span><button type="button" className="ghost-button" disabled={clientsMeta.page >= clientsMeta.totalPages} onClick={() => changeClientsPage(clientsMeta.page + 1)}>Próxima</button></div>
            </section>
            <section className="panel form-panel">
              <div className="panel-header"><h3>Itens</h3><p>Catálogo base disponível para composição das OVs.</p></div>
              {isAdmin ? (
                <form className="inline-form" onSubmit={handleCreateItem}>
                  <input placeholder="SKU" value={itemForm.sku} onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value }))} />
                  <input placeholder="Nome do item" value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} />
                  <input placeholder="Unidade de medida" value={itemForm.unitOfMeasure} onChange={(event) => setItemForm((current) => ({ ...current, unitOfMeasure: event.target.value }))} />
                  <textarea placeholder="Descrição" value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} />
                  <button disabled={busyAction === 'create-item'} type="submit">Salvar item</button>
                </form>
              ) : <p className="role-note">Somente administradores podem criar ou editar itens.</p>}
              <ul className="clean-list master-list">{items.map((item) => <li key={item.id}><strong>{item.sku} · {item.name}</strong><span>{item.unitOfMeasure}</span><small>{item.description || 'Sem descrição'}</small></li>)}</ul>
              <div className="pager compact-pager"><button type="button" className="ghost-button" disabled={itemsMeta.page <= 1} onClick={() => changeItemsPage(itemsMeta.page - 1)}>Anterior</button><span>{itemsMeta.page}/{itemsMeta.totalPages}</span><button type="button" className="ghost-button" disabled={itemsMeta.page >= itemsMeta.totalPages} onClick={() => changeItemsPage(itemsMeta.page + 1)}>Próxima</button></div>
            </section>
          </section>
        ) : null}

        {!loading && activeTab === 'orders' ? (
          <section className="tab-grid">
            <form className="panel order-form" onSubmit={handleCreateOrder}>
              <div className="panel-header"><h3>Nova Ordem de Venda</h3><p>Crie uma OV apenas com transporte autorizado e itens previamente cadastrados.</p></div>
              <div className="grid-two">
                <select value={orderForm.clientId} onChange={(event) => setOrderForm((current) => ({ ...current, clientId: event.target.value, transportTypeId: '' }))}>
                  <option value="">Selecione o cliente</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                <select value={orderForm.transportTypeId} onChange={(event) => setOrderForm((current) => ({ ...current, transportTypeId: event.target.value }))}>
                  <option value="">Selecione o transporte</option>
                  {availableTransportsForSelectedClient.map((transportType) => <option key={transportType.id} value={transportType.id}>{transportType.name}</option>)}
                </select>
              </div>
              <div className="stacked-list">
                {orderForm.items.map((entry, index) => (
                  <div className="item-row" key={`${entry.itemId}-${index}`}>
                    <select value={entry.itemId} onChange={(event) => {
                      const nextItems = [...orderForm.items]
                      nextItems[index] = { ...nextItems[index], itemId: event.target.value }
                      setOrderForm((current) => ({ ...current, items: nextItems }))
                    }}>
                      <option value="">Selecione o item</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}
                    </select>
                    <input min={1} type="number" value={entry.quantity} onChange={(event) => {
                      const nextItems = [...orderForm.items]
                      nextItems[index] = { ...nextItems[index], quantity: Number(event.target.value) }
                      setOrderForm((current) => ({ ...current, items: nextItems }))
                    }} />
                    <button type="button" className="ghost-button" onClick={() => setOrderForm((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index) }))}>Remover</button>
                  </div>
                ))}
              </div>
              <div className="action-row">
                <button type="button" className="ghost-button" onClick={() => setOrderForm((current) => ({ ...current, items: [...current.items, { itemId: '', quantity: 1 }] }))}>Adicionar item</button>
                <button disabled={busyAction === 'create-order'} type="submit">Criar OV</button>
              </div>
            </form>

            <section className="panel filters-panel">
              <div className="panel-header"><h3>Monitoramento Operacional</h3><p>Use filtros por status, cliente, transporte e data.</p></div>
              <div className="grid-three">
                <select value={orderFilters.status} onChange={(event) => { changeOrdersPage(1); setOrderFilters((current) => ({ ...current, status: event.target.value })) }}><option value="">Todos os status</option>{ORDER_FLOW.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                <select value={orderFilters.clientId} onChange={(event) => { changeOrdersPage(1); setOrderFilters((current) => ({ ...current, clientId: event.target.value })) }}><option value="">Todos os clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
                <select value={orderFilters.transportTypeId} onChange={(event) => { changeOrdersPage(1); setOrderFilters((current) => ({ ...current, transportTypeId: event.target.value })) }}><option value="">Todos os transportes</option>{transportTypes.map((transportType) => <option key={transportType.id} value={transportType.id}>{transportType.name}</option>)}</select>
                <input type="date" value={orderFilters.dateFrom} onChange={(event) => { changeOrdersPage(1); setOrderFilters((current) => ({ ...current, dateFrom: event.target.value })) }} />
                <input type="date" value={orderFilters.dateTo} onChange={(event) => { changeOrdersPage(1); setOrderFilters((current) => ({ ...current, dateTo: event.target.value })) }} />
                <input placeholder="Buscar por código, cliente ou transporte" value={orderFilters.search} onChange={(event) => setOrderFilters((current) => ({ ...current, search: event.target.value }))} />
              </div>
            </section>

            <section className="orders-grid">
              {visibleOrders.map((order) => {
                const nextStatus = getNextStatus(order.status)
                const clientReference = clients.find((client) => client.id === order.client.id)
                const authorizedTransportOptions = clientReference?.authorizedTransportTypes ?? []
                const scheduleForm = scheduleForms[order.id] ?? {
                  ...emptySchedule,
                  deliveryDate: order.deliveryDate ? order.deliveryDate.slice(0, 16) : '',
                  serviceWindowStart: order.serviceWindowStart ?? '08:00',
                  serviceWindowEnd: order.serviceWindowEnd ?? '12:00',
                  confirm: order.schedulingConfirmed,
                }

                return (
                  <article className="panel order-card" key={order.id}>
                    <div className="order-card-header">
                      <div><p className="section-label">{order.code}</p><h3>{order.client.name}</h3></div>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                    </div>
                    <div className="order-meta"><span>Transporte: {order.transportType.name}</span><span>Entrega: {formatDate(order.deliveryDate)}</span></div>
                    <ul className="clean-list compact">{order.items.map((entry) => <li key={entry.itemId}><strong>{entry.item.name}</strong><span>{entry.quantity} {entry.item.unitOfMeasure}</span></li>)}</ul>
                    <div className="action-row"><button disabled={!nextStatus || busyAction === `status-${order.id}`} type="button" onClick={() => handleOrderStatusUpdate(order)}>{nextStatus ? `Avançar para ${nextStatus}` : 'Fluxo concluído'}</button></div>
                    <div className="subpanel">
                      <p className="section-label">Central de Agendamento</p>
                      <div className="grid-two">
                        <input type="datetime-local" value={scheduleForm.deliveryDate} onChange={(event) => setScheduleForms((current) => ({ ...current, [order.id]: { ...scheduleForm, deliveryDate: event.target.value } }))} />
                        <label className="checkbox-row"><input checked={scheduleForm.confirm} type="checkbox" onChange={(event) => setScheduleForms((current) => ({ ...current, [order.id]: { ...scheduleForm, confirm: event.target.checked } }))} />Confirmar agendamento</label>
                        <input type="time" value={scheduleForm.serviceWindowStart} onChange={(event) => setScheduleForms((current) => ({ ...current, [order.id]: { ...scheduleForm, serviceWindowStart: event.target.value } }))} />
                        <input type="time" value={scheduleForm.serviceWindowEnd} onChange={(event) => setScheduleForms((current) => ({ ...current, [order.id]: { ...scheduleForm, serviceWindowEnd: event.target.value } }))} />
                      </div>
                      <button disabled={busyAction === `schedule-${order.id}`} type="button" onClick={() => handleScheduling(order.id)}>Salvar agendamento</button>
                    </div>
                    <div className="subpanel">
                      <p className="section-label">Alteração de transporte</p>
                      <div className="action-row stretch">
                        <select value={transportSelections[order.id] ?? ''} onChange={(event) => setTransportSelections((current) => ({ ...current, [order.id]: event.target.value }))}>
                          <option value="">Selecione um novo transporte</option>
                          {authorizedTransportOptions.map((entry) => <option key={entry.transportTypeId} value={entry.transportTypeId}>{entry.transportType.name}</option>)}
                        </select>
                        <button disabled={busyAction === `transport-${order.id}`} type="button" onClick={() => handleTransportChange(order.id)}>Alterar</button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
            <div className="pager">
              <button type="button" className="ghost-button" disabled={ordersMeta.page <= 1} onClick={() => changeOrdersPage(ordersMeta.page - 1)}>Página anterior</button>
              <span>Página {ordersMeta.page} de {ordersMeta.totalPages} · {ordersMeta.total} registros</span>
              <button type="button" className="ghost-button" disabled={ordersMeta.page >= ordersMeta.totalPages} onClick={() => changeOrdersPage(ordersMeta.page + 1)}>Próxima página</button>
            </div>
          </section>
        ) : null}

        {!loading && activeTab === 'audit' ? (
          <section className="panel audit-panel">
            <div className="panel-header"><h3>Trilha de Auditoria</h3><p>Eventos críticos do fluxo operacional e alterações relevantes.</p></div>
            <div className="audit-table">
              <div className="audit-head"><span>Quando</span><span>Ação</span><span>Entidade</span><span>Estado posterior</span></div>
              {auditEvents.map((event) => (
                <div className="audit-row" key={event.id}>
                  <span>{formatDate(event.createdAt)}</span>
                  <strong>{event.action}</strong>
                  <span>{event.entityType}</span>
                  <code>{JSON.stringify(event.nextState)}</code>
                </div>
              ))}
            </div>
            <div className="pager">
              <button type="button" className="ghost-button" disabled={auditMeta.page <= 1} onClick={() => changeAuditPage(auditMeta.page - 1)}>Página anterior</button>
              <span>Página {auditMeta.page} de {auditMeta.totalPages} · {auditMeta.total} eventos</span>
              <button type="button" className="ghost-button" disabled={auditMeta.page >= auditMeta.totalPages} onClick={() => changeAuditPage(auditMeta.page + 1)}>Próxima página</button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
