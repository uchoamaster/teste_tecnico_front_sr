import { UserRole } from '@prisma/client';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authorized } from '../common/decorators/authorized.decorator';
import { AuditService } from './audit.service';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

@ApiTags('Audit')
@Controller('audit-events')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  findAll(@Query() query: ListAuditEventsQueryDto) {
    return this.auditService.list(query);
  }
}