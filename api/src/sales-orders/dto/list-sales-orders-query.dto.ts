import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class ListSalesOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  dateTo?: string;
}