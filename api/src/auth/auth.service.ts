import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { StringValue } from 'ms';
import { UserRole } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersRepository.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const tokens = await this.issueTokens({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });

    await this.usersRepository.updateRefreshTokenHash(
      user.id,
      await hash(tokens.refreshToken, 10),
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.validateToken(refreshToken, true);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Sessão inválida ou encerrada.');
    }

    const refreshMatches = await compare(refreshToken, user.refreshTokenHash);

    if (!refreshMatches) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const tokens = await this.issueTokens({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });

    await this.usersRepository.updateRefreshTokenHash(
      user.id,
      await hash(tokens.refreshToken, 10),
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async logout(userId: string) {
    await this.usersRepository.updateRefreshTokenHash(userId, null);
    return { success: true };
  }

  async validateToken(token: string, isRefreshToken = false) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        username: string;
        role: UserRole;
        displayName: string;
        type?: 'access' | 'refresh';
      }>(token);

      if (!isRefreshToken && payload.type && payload.type !== 'access') {
        throw new UnauthorizedException('Token inválido ou expirado.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        isRefreshToken
          ? 'Refresh token inválido ou expirado.'
          : 'Token inválido ou expirado.',
      );
    }
  }

  private async issueTokens(user: {
    id: string;
    username: string;
    role: UserRole;
    displayName: string;
  }) {
    const accessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      type: 'access' as const,
    };

    const refreshTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      type: 'refresh' as const,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload);
    const refreshExpiresIn =
      (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as StringValue | undefined) ??
      ('7d' as StringValue);
    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      expiresIn: refreshExpiresIn,
      jwtid: randomUUID(),
    });

    return { accessToken, refreshToken };
  }
}