import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { ClientsRepository } from '../clients/clients.repository';
import { ItemsRepository } from '../items/items.repository';
import { TransportTypesRepository } from '../transport-types/transport-types.repository';
import { getExpectedNextStatus } from './constants/order-status-flow';
import { ChangeSalesOrderTransportDto } from './dto/change-sales-order-transport.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { ListSalesOrdersQueryDto } from './dto/list-sales-orders-query.dto';
import { ManageSchedulingDto } from './dto/manage-scheduling.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { SalesOrdersRepository } from './sales-orders.repository';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly transportTypesRepository: TransportTypesRepository,
    private readonly itemsRepository: ItemsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSalesOrderDto) {
    const client = await this.clientsRepository.findById(dto.clientId);

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const transportType = await this.transportTypesRepository.findById(
      dto.transportTypeId,
    );

    if (!transportType) {
      throw new NotFoundException('Tipo de transporte não encontrado.');
    }

    const isAuthorized = client.authorizedTransportTypes.some(
      (item) => item.transportTypeId === dto.transportTypeId,
    );

    if (!isAuthorized) {
      throw new BadRequestException(
        'O tipo de transporte informado não está autorizado para o cliente.',
      );
    }

    const itemIds = dto.items.map((item) => item.itemId);
    const items = await this.itemsRepository.findByIds(itemIds);

    if (items.length !== itemIds.length) {
      throw new BadRequestException(
        'Todos os itens da ordem devem estar previamente cadastrados.',
      );
    }

    const order = await this.salesOrdersRepository.create({
      code: `OV-${randomUUID().split('-')[0].toUpperCase()}`,
      clientId: dto.clientId,
      transportTypeId: dto.transportTypeId,
      status: OrderStatus.CRIADA,
      items: {
        create: dto.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      },
    });

    await this.auditService.logEvent({
      entityType: 'SalesOrder',
      entityId: order.id,
      action: 'SALES_ORDER_CREATED',
      nextState: this.salesOrdersRepository.mapState(order),
      salesOrderId: order.id,
    });

    return this.findOne(order.id);
  }

  findAll(query: ListSalesOrdersQueryDto) {
    return this.salesOrdersRepository.findAll(query);
  }

  async findOne(id: string) {
    const order = await this.salesOrdersRepository.findById(id);

    if (!order) {
      throw new NotFoundException('Ordem de venda não encontrada.');
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto) {
    const order = await this.findOne(id);
    const expectedNextStatus = getExpectedNextStatus(order.status);

    if (dto.status !== expectedNextStatus) {
      throw new BadRequestException(
        `Transição inválida. O próximo status esperado é ${expectedNextStatus ?? 'nenhum'}.`,
      );
    }

    if (
      dto.status === OrderStatus.AGENDADA &&
      (!order.deliveryDate || !order.serviceWindowStart || !order.serviceWindowEnd)
    ) {
      throw new BadRequestException(
        'O agendamento precisa estar preenchido antes da ordem ser agendada.',
      );
    }

    const updated = await this.salesOrdersRepository.update(id, {
      status: dto.status,
      schedulingConfirmed:
        dto.status === OrderStatus.AGENDADA ? true : order.schedulingConfirmed,
    });

    await this.auditService.logEvent({
      entityType: 'SalesOrder',
      entityId: order.id,
      action: 'SALES_ORDER_STATUS_CHANGED',
      previousState: this.salesOrdersRepository.mapState(order),
      nextState: this.salesOrdersRepository.mapState(updated),
      salesOrderId: order.id,
    });

    return updated;
  }

  async manageScheduling(id: string, dto: ManageSchedulingDto) {
    const order = await this.findOne(id);

    if (
      order.status !== OrderStatus.PLANEJADA &&
      order.status !== OrderStatus.AGENDADA
    ) {
      throw new BadRequestException(
        'O agendamento só pode ser definido para ordens planejadas ou já agendadas.',
      );
    }

    if (dto.serviceWindowEnd <= dto.serviceWindowStart) {
      throw new BadRequestException(
        'A janela de atendimento final deve ser maior do que a inicial.',
      );
    }

    const nextStatus = dto.confirm ? OrderStatus.AGENDADA : order.status;

    const updated = await this.salesOrdersRepository.update(id, {
      deliveryDate: new Date(dto.deliveryDate),
      serviceWindowStart: dto.serviceWindowStart,
      serviceWindowEnd: dto.serviceWindowEnd,
      schedulingConfirmed: dto.confirm,
      status: nextStatus,
    });

    await this.auditService.logEvent({
      entityType: 'SalesOrder',
      entityId: order.id,
      action: 'SALES_ORDER_SCHEDULING_CHANGED',
      previousState: this.salesOrdersRepository.mapState(order),
      nextState: this.salesOrdersRepository.mapState(updated),
      salesOrderId: order.id,
    });

    return updated;
  }

  async changeTransport(id: string, dto: ChangeSalesOrderTransportDto) {
    const order = await this.findOne(id);

    if (
      order.status === OrderStatus.EM_TRANSPORTE ||
      order.status === OrderStatus.ENTREGUE
    ) {
      throw new BadRequestException(
        'Não é permitido alterar o transporte após o início do transporte.',
      );
    }

    const client = await this.clientsRepository.findById(order.clientId);

    if (!client) {
      throw new NotFoundException('Cliente da ordem não encontrado.');
    }

    const transportType = await this.transportTypesRepository.findById(
      dto.transportTypeId,
    );

    if (!transportType) {
      throw new NotFoundException('Tipo de transporte não encontrado.');
    }

    const isAuthorized = client.authorizedTransportTypes.some(
      (item) => item.transportTypeId === dto.transportTypeId,
    );

    if (!isAuthorized) {
      throw new BadRequestException(
        'O novo tipo de transporte não está autorizado para o cliente da ordem.',
      );
    }

    const updated = await this.salesOrdersRepository.update(id, {
      transportTypeId: dto.transportTypeId,
    });

    await this.auditService.logEvent({
      entityType: 'SalesOrder',
      entityId: order.id,
      action: 'SALES_ORDER_TRANSPORT_CHANGED',
      previousState: this.salesOrdersRepository.mapState(order),
      nextState: this.salesOrdersRepository.mapState(updated),
      salesOrderId: order.id,
    });

    return updated;
  }
}