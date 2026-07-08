import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { Authorized } from '../common/decorators/authorized.decorator';
import { ChangeSalesOrderTransportDto } from './dto/change-sales-order-transport.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { ListSalesOrdersQueryDto } from './dto/list-sales-orders-query.dto';
import { ManageSchedulingDto } from './dto/manage-scheduling.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('Sales Orders')
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Post()
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  findAll(@Query() query: ListSalesOrdersQueryDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.salesOrdersService.updateStatus(id, dto);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Put(':id/scheduling')
  manageScheduling(@Param('id') id: string, @Body() dto: ManageSchedulingDto) {
    return this.salesOrdersService.manageScheduling(id, dto);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch(':id/transport')
  changeTransport(
    @Param('id') id: string,
    @Body() dto: ChangeSalesOrderTransportDto,
  ) {
    return this.salesOrdersService.changeTransport(id, dto);
  }
}