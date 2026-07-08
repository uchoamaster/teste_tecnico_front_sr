import { Injectable } from '@nestjs/common';
import { buildPaginatedResponse } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { ListTransportTypesQueryDto } from './dto/list-transport-types-query.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

@Injectable()
export class TransportTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTransportTypeDto) {
    return this.prisma.transportType.create({ data: dto });
  }

  async findAll(query: ListTransportTypesQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transportType.findMany({
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.transportType.count(),
    ]);

    return buildPaginatedResponse(data, query.page, query.pageSize, total);
  }

  findById(id: string) {
    return this.prisma.transportType.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateTransportTypeDto) {
    return this.prisma.transportType.update({ where: { id }, data: dto });
  }
}