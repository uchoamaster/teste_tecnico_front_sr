import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsString, Matches } from 'class-validator';

export class ManageSchedulingDto {
  @ApiProperty()
  @IsDateString()
  deliveryDate!: string;

  @ApiProperty({ example: '08:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  serviceWindowStart!: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  serviceWindowEnd!: string;

  @ApiProperty()
  @Type(() => Boolean)
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  confirm!: boolean;
}