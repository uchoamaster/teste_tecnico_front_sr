import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { TransportTypesModule } from './transport-types/transport-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
    ClientsModule,
    ItemsModule,
    SalesOrdersModule,
    TransportTypesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
