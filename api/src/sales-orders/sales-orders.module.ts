import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { ItemsModule } from '../items/items.module';
import { TransportTypesModule } from '../transport-types/transport-types.module';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersRepository } from './sales-orders.repository';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [AuditModule, ClientsModule, ItemsModule, TransportTypesModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersRepository, SalesOrdersService],
  exports: [SalesOrdersRepository, SalesOrdersService],
})
export class SalesOrdersModule {}