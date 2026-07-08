import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginatedResponse } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AuditEventUncheckedCreateInput) {
    return this.prisma.auditEvent.create({ data });
  }

  async findAll(query: ListAuditEventsQueryDto) {
    const where = {
      entityType: query.entityType,
      entityId: query.entityId,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return buildPaginatedResponse(data, query.page, query.pageSize, total);
  }
}