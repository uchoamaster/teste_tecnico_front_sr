import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer ausente.');
    }

    const token = authorization.replace('Bearer ', '');
    request.user = await this.authService.validateToken(token);
    return true;
  }
}