import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsRepository } from '../clients/clients.repository';
import { ItemsRepository } from '../items/items.repository';
import { TransportTypesRepository } from '../transport-types/transport-types.repository';
import { SalesOrdersRepository } from './sales-orders.repository';
import { SalesOrdersService } from './sales-orders.service';

describe('SalesOrdersService', () => {
  const salesOrdersRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    mapState: jest.fn((order) => order),
  } as unknown as jest.Mocked<SalesOrdersRepository>;

  const clientsRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<ClientsRepository>;

  const transportTypesRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<TransportTypesRepository>;

  const itemsRepository = {
    findByIds: jest.fn(),
  } as unknown as jest.Mocked<ItemsRepository>;

  const auditService = {
    logEvent: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  const service = new SalesOrdersService(
    salesOrdersRepository,
    clientsRepository,
    transportTypesRepository,
    itemsRepository,
    auditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects sales order creation when the transport type is not authorized for the client', async () => {
    clientsRepository.findById.mockResolvedValue({
      id: 'client-1',
      name: 'Cliente Teste',
      code: 'CLI-1',
      authorizedTransportTypes: [{ transportTypeId: 'transport-1' }],
    } as never);
    transportTypesRepository.findById.mockResolvedValue({
      id: 'transport-2',
      name: 'Bi-truck',
    } as never);

    await expect(
      service.create({
        clientId: 'client-1',
        transportTypeId: 'transport-2',
        items: [{ itemId: 'item-1', quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid status transitions outside the defined operational flow', async () => {
    salesOrdersRepository.findById.mockResolvedValue({
      id: 'order-1',
      code: 'OV-ABC',
      status: OrderStatus.CRIADA,
      deliveryDate: null,
      serviceWindowStart: null,
      serviceWindowEnd: null,
      schedulingConfirmed: false,
      client: { id: 'client-1', name: 'Cliente Teste', code: 'CLI-1', authorizedTransportTypes: [] },
      transportType: { id: 'transport-1', name: 'Caminhão' },
      items: [],
      auditEvents: [],
    } as never);

    await expect(
      service.updateStatus('order-1', { status: OrderStatus.AGENDADA }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});