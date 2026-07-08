import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'OVGS API',
      timestamp: new Date().toISOString(),
    };
  }
}
