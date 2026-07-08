import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateRefreshTokenHash(id: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }
}