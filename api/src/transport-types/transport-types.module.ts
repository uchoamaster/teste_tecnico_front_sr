import { Module } from '@nestjs/common';
import { TransportTypesController } from './transport-types.controller';
import { TransportTypesRepository } from './transport-types.repository';
import { TransportTypesService } from './transport-types.service';

@Module({
  controllers: [TransportTypesController],
  providers: [TransportTypesRepository, TransportTypesService],
  exports: [TransportTypesRepository, TransportTypesService],
})
export class TransportTypesModule {}