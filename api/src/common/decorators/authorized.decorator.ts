import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

export function Authorized(...roles: UserRole[]) {
  return applyDecorators(
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
  );
}