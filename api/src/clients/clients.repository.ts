import { Injectable } from '@nestjs/common';
import { buildPaginatedResponse } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        code: dto.code,
        name: dto.name,
        authorizedTransportTypes: dto.authorizedTransportTypeIds?.length
          ? {
              create: dto.authorizedTransportTypeIds.map((transportTypeId) => ({
                transportTypeId,
              })),
            }
          : undefined,
      },
      include: {
        authorizedTransportTypes: { include: { transportType: true } },
      },
    });
  }

  async findAll(query: ListClientsQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        include: {
          authorizedTransportTypes: { include: { transportType: true } },
        },
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.client.count(),
    ]);

    return buildPaginatedResponse(data, query.page, query.pageSize, total);
  }

  findById(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        authorizedTransportTypes: { include: { transportType: true } },
      },
    });
  }

  update(id: string, dto: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        authorizedTransportTypes: dto.authorizedTransportTypeIds
          ? {
              deleteMany: {},
              create: dto.authorizedTransportTypeIds.map((transportTypeId) => ({
                transportTypeId,
              })),
            }
          : undefined,
      },
      include: {
        authorizedTransportTypes: { include: { transportType: true } },
      },
    });
  }
}