import { Injectable, NotFoundException } from '@nestjs/common';
import { TransportTypesRepository } from './transport-types.repository';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { ListTransportTypesQueryDto } from './dto/list-transport-types-query.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

@Injectable()
export class TransportTypesService {
  constructor(
    private readonly transportTypesRepository: TransportTypesRepository,
  ) {}

  create(dto: CreateTransportTypeDto) {
    return this.transportTypesRepository.create(dto);
  }

  findAll(query: ListTransportTypesQueryDto) {
    return this.transportTypesRepository.findAll(query);
  }

  async findOne(id: string) {
    const transportType = await this.transportTypesRepository.findById(id);

    if (!transportType) {
      throw new NotFoundException('Tipo de transporte não encontrado.');
    }

    return transportType;
  }

  async update(id: string, dto: UpdateTransportTypeDto) {
    await this.findOne(id);
    return this.transportTypesRepository.update(id, dto);
  }
}