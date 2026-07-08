import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const payload = this.resolvePayload(exception, status, request.url);

    response.status(status).json(payload);
  }

  private resolveStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return HttpStatus.CONFLICT;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolvePayload(exception: unknown, status: number, path: string) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] }).message ??
            exception.message;

      return {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path,
        error: Array.isArray(message) ? message.join('; ') : message,
      };
    }

    if (
      exception instanceof PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      return {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path,
        error: 'Registro duplicado para um campo único.',
      };
    }

    return {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      error: 'Erro interno no servidor.',
    };
  }
}