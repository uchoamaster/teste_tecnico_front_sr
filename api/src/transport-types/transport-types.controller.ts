import { UserRole } from '@prisma/client';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authorized } from '../common/decorators/authorized.decorator';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { ListTransportTypesQueryDto } from './dto/list-transport-types-query.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';
import { TransportTypesService } from './transport-types.service';

@ApiTags('Transport Types')
@Controller('transport-types')
export class TransportTypesController {
  constructor(
    private readonly transportTypesService: TransportTypesService,
  ) {}

  @Authorized(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTransportTypeDto) {
    return this.transportTypesService.create(dto);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  findAll(@Query() query: ListTransportTypesQueryDto) {
    return this.transportTypesService.findAll(query);
  }

  @Authorized(UserRole.ADMIN, UserRole.OPERATOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transportTypesService.findOne(id);
  }

  @Authorized(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransportTypeDto) {
    return this.transportTypesService.update(id, dto);
  }
}