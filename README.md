# OVGS - Sistema de Gestão de Ordens de Venda

Solução full stack para o desafio técnico de gestão do ciclo de vida de Ordens de Venda, cobrindo cadastros base, criação e monitoramento operacional de OVs, agendamento de entrega, auditoria e execução via Docker Compose.

## Stack

- Node.js
- TypeScript
- NestJS
- Prisma ORM
- PostgreSQL
- React + Vite
- Docker Compose
- Jest + Supertest
- Swagger / OpenAPI
- JWT com perfis de acesso
- GitHub Actions CI

## Estrutura

```text
.
|-- api
|   |-- prisma
|   |-- src
|   `-- test
|-- web
`-- docker-compose.yml
```

## Modelagem do domínio

### Entidades principais

- `Client`: cliente com código único e lista de tipos de transporte autorizados.
- `TransportType`: modalidade de transporte cadastrável sem alteração de regra de negócio.
- `Item`: catálogo prévio de itens com SKU único.
- `SalesOrder`: ordem vinculada a um cliente, um tipo de transporte, um ou mais itens e um status do fluxo.
- `SalesOrderItem`: associação item/ordem com quantidade.
- `AuditEvent`: trilha de eventos relevantes com antes/depois em JSON.

### Regras de negócio implementadas

- OV só pode ser criada se o tipo de transporte estiver autorizado para o cliente.
- OV precisa conter ao menos um item previamente cadastrado.
- Fluxo operacional é estritamente sequencial:
  - `CRIADA -> PLANEJADA -> AGENDADA -> EM_TRANSPORTE -> ENTREGUE`
- Agendamento só é permitido para ordens `PLANEJADA` ou `AGENDADA`.
- Mudança de transporte é bloqueada após início do transporte.
- Auditoria mínima registra:
  - criação da OV
  - alteração de status
  - alteração de agendamento
  - alteração de transporte

## Decisões arquiteturais

- **NestJS modular** para separar responsabilidades por contexto (`clients`, `transport-types`, `items`, `sales-orders`, `audit`).
- **Repositories dedicados** encapsulam o acesso ao Prisma e evitam espalhar consultas pela camada de serviço.
- **Services** concentram regras de negócio e coordenação entre agregados.
- **DTOs + ValidationPipe global** garantem validação declarativa de entrada.
- **JWT com RBAC leve** protege os endpoints e separa permissões de `ADMIN` e `OPERATOR` sem introduzir complexidade desproporcional ao desafio.
- **Paginação consistente** em listagens reduz volume de payload e prepara o sistema para crescimento operacional.
- **HttpExceptionFilter** padroniza respostas de erro e trata colisões de unicidade do Prisma.
- **Swagger** expõe a API em `/docs` para inspeção e teste manual.
- **Frontend single-page operacional** foi escolhido para demonstrar o fluxo completo sem custo de complexidade adicional de roteamento distribuído.

## Persistência

- Banco relacional: PostgreSQL.
- ORM: Prisma.
- Estratégia usada no repositório:
  - schema versionado em `api/prisma/schema.prisma`
  - criação sincronizada com `prisma db push`
  - seed para dados iniciais de clientes, transportes e itens

## Considerações sobre escalabilidade

- O desenho modular permite evoluir para filas/eventos em torno de `AuditEvent` e mudanças de status sem quebrar contratos existentes.
- A separação entre controllers, services e repositories facilita extração futura para casos de uso mais explícitos ou Clean Architecture completa.
- Filtros de monitoramento estão concentrados no repositório de OVs, o que simplifica otimização de consultas e inclusão de paginação.
- O uso de `AuditEvent` com JSON oferece rastreabilidade imediata, com possibilidade de futura externalização para event store ou pipeline analítico.
- O pipeline de CI valida geração do client Prisma, sincronização do schema, testes e builds do monorepo.

## Considerações sobre performance

- Consultas de OV usam `include` controlado para trazer cliente, transporte, itens e eventos recentes em uma ida ao banco.
- Campos únicos (`code`, `sku`, `name`) evitam duplicidade operacional e simplificam busca.
- O frontend usa `useDeferredValue` para a busca textual local sem bloquear a experiência durante digitação.

## Trade-offs assumidos

- Foi priorizada clareza arquitetural sobre autenticação federada completa e edição visual de cadastros, que extrapolariam o foco principal do desafio.
- A autenticação adotada neste estágio é propositalmente objetiva: JWT com usuários seedados, refresh token rotativo e perfis `ADMIN`/`OPERATOR`. Em ambiente corporativo, o passo natural seria integrar identidade externa, storage mais forte de sessão e políticas avançadas de revogação multi-dispositivo.
- `prisma db push` foi adotado para simplificar a execução do avaliador. Em produção, o natural seria migrar para pipeline formal de migrations.
- O frontend concentra múltiplas capacidades em uma única superfície operacional para demonstrar o escopo integral do desafio com menor atrito de navegação.

## Endpoints principais

### Cadastros

- `POST /clients`
- `GET /clients`
- `PATCH /clients/:id`
- `POST /transport-types`
- `GET /transport-types`
- `PATCH /transport-types/:id`
- `POST /items`
- `GET /items`

### Ordens de Venda

- `POST /sales-orders`
- `GET /sales-orders`
- `GET /sales-orders/:id`
- `PATCH /sales-orders/:id/status`
- `PUT /sales-orders/:id/scheduling`
- `PATCH /sales-orders/:id/transport`

### Auditoria

- `GET /audit-events`

### Autenticação

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Segurança operacional

- Todos os endpoints operacionais exigem Bearer token JWT.
- Perfis de acesso:
  - `ADMIN`: acesso total, incluindo cadastros base.
  - `OPERATOR`: consulta operacional, criação e movimentação de OVs, consulta de auditoria.
- O backend emite `accessToken` de curta duração e `refreshToken` rotativo para renovação de sessão.
- O frontend mantém a sessão localmente, envia `Authorization: Bearer <token>` a cada chamada e tenta renovar automaticamente o access token ao receber `401` em rotas protegidas.
- `POST /auth/logout` invalida o refresh token persistido do usuário no servidor.

## Paginação

Listagens retornam o formato:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

## Como executar com Docker Compose

Na raiz do projeto:

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:4173`
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- PostgreSQL: `localhost:5432`

## Como executar localmente passo a passo

### 1. Subir o banco

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd api
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run start:dev
```

Variáveis principais:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Credenciais do seed:

- `admin / Admin@123`
- `operator / Operator@123`

### 3. Frontend

```bash
cd web
copy .env.example .env
npm install
npm run dev
```

## CI/CD

Workflow disponível em `.github/workflows/ci.yml`.

Cobertura do pipeline:

- instalação de dependências do backend e frontend
- geração do Prisma Client
- aplicação do schema no PostgreSQL de CI
- testes unitários
- teste de integração
- build da API
- build do frontend

## Testes

### Unitários

```bash
cd api
npm run test:unit
```

### Integração

Pré-requisito: banco Postgres disponível e schema aplicado.

```bash
cd api
npm run prisma:push
npm run test:e2e
```

O teste de integração cobre login, criação de OV autenticada e rotação de refresh token.

## Cenário inicial do seed

- Clientes:
  - `Construtora Alpha`
  - `Distribuidora Beta`
- Transportes:
  - `Caminhão`
  - `Carreta`
  - `Bi-truck`
- Itens:
  - `SKU-001`
  - `SKU-002`
  - `SKU-003`

## Diferenciais entregues

- Swagger / OpenAPI
- Estrutura modular com separação de responsabilidades
- Auditoria persistida de eventos críticos
- Paginação nas consultas operacionais
- Segurança com JWT e separação por papel
- Sessão com refresh token rotativo e logout invalidando renovação futura
- Pipeline de CI com PostgreSQL para testes automatizados
- Docker Compose para execução completa
- 2 testes unitários
- 2 testes de integração
- UI operacional conectada à API real