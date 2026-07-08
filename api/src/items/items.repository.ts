import { Injectable } from '@nestjs/common';
import { buildPaginatedResponse } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';

@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateItemDto) {
    return this.prisma.item.create({ data: dto });
  }

  async findAll(query: ListItemsQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.item.count(),
    ]);

    return buildPaginatedResponse(data, query.page, query.pageSize, total);
  }

  findByIds(ids: string[]) {
    return this.prisma.item.findMany({ where: { id: { in: ids } } });
  }
}