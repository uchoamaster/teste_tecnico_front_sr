import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeSalesOrderTransportDto {
  @ApiProperty()
  @IsString()
  transportTypeId!: string;
}