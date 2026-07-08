import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly clientsRepository: ClientsRepository) {}

  create(dto: CreateClientDto) {
    return this.clientsRepository.create(dto);
  }

  findAll(query: ListClientsQueryDto) {
    return this.clientsRepository.findAll(query);
  }

  async findOne(id: string) {
    const client = await this.clientsRepository.findById(id);

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.clientsRepository.update(id, dto);
  }
}