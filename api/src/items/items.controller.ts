import { UserRole } from '@prisma/client';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authorized } from '../common/decorators/authorized.decorator';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { ItemsService } from './items.service';

@ApiTags('Items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Authorized(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  findAll(@Query() query: ListItemsQueryDto) {
    return this.itemsService.findAll(query);
  }
}