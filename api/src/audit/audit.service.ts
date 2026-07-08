import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

type AuditPayload = {
  entityType: string;
  entityId: string;
  action: string;
  previousState?: unknown;
  nextState?: unknown;
  salesOrderId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  logEvent(payload: AuditPayload) {
    return this.auditRepository.create({
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      previousState: payload.previousState as object | undefined,
      nextState: payload.nextState as object | undefined,
      salesOrderId: payload.salesOrderId,
    });
  }

  list(query: ListAuditEventsQueryDto) {
    return this.auditRepository.findAll(query);
  }
}