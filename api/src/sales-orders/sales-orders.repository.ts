import { Injectable } from '@nestjs/common';
import { Prisma, SalesOrder } from '@prisma/client';
import { buildPaginatedResponse } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListSalesOrdersQueryDto } from './dto/list-sales-orders-query.dto';

@Injectable()
export class SalesOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly orderInclude = {
    client: true,
    transportType: true,
    items: { include: { item: true } },
    auditEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
  } satisfies Prisma.SalesOrderInclude;

  create(data: Prisma.SalesOrderUncheckedCreateInput) {
    return this.prisma.salesOrder.create({
      data,
      include: this.orderInclude,
    });
  }

  async findAll(query: ListSalesOrdersQueryDto) {
    const where = {
      status: query.status,
      clientId: query.clientId,
      transportTypeId: query.transportTypeId,
      deliveryDate:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
    } satisfies Prisma.SalesOrderWhereInput;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        include: this.orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return buildPaginatedResponse(data, query.page, query.pageSize, total);
  }

  findById(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
      include: this.orderInclude,
    });
  }

  update(id: string, data: Prisma.SalesOrderUncheckedUpdateInput) {
    return this.prisma.salesOrder.update({
      where: { id },
      data,
      include: this.orderInclude,
    });
  }

  async deleteAll() {
    await this.prisma.auditEvent.deleteMany();
    await this.prisma.salesOrderItem.deleteMany();
    await this.prisma.salesOrder.deleteMany();
    await this.prisma.clientTransportType.deleteMany();
    await this.prisma.client.deleteMany();
    await this.prisma.transportType.deleteMany();
    await this.prisma.item.deleteMany();
  }

  mapState(order: SalesOrder & { [key: string]: unknown }) {
    return {
      id: order.id,
      code: order.code,
      clientId: order.clientId,
      transportTypeId: order.transportTypeId,
      status: order.status,
      deliveryDate: order.deliveryDate,
      serviceWindowStart: order.serviceWindowStart,
      serviceWindowEnd: order.serviceWindowEnd,
      schedulingConfirmed: order.schedulingConfirmed,
    };
  }
}