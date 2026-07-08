import 'express';
import { UserRole } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub: string;
      username: string;
      role: UserRole;
      displayName: string;
    };
  }
}