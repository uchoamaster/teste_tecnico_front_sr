import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SalesOrderItemInputDto {
  @ApiProperty()
  @IsString()
  itemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsString()
  clientId!: string;

  @ApiProperty()
  @IsString()
  transportTypeId!: string;

  @ApiProperty({ type: [SalesOrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemInputDto)
  items!: SalesOrderItemInputDto[];
}

export { SalesOrderItemInputDto };