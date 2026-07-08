import { PartialType } from '@nestjs/swagger';
import { CreateTransportTypeDto } from './create-transport-type.dto';

export class UpdateTransportTypeDto extends PartialType(CreateTransportTypeDto) {}