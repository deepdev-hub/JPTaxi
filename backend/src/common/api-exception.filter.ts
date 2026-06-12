import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

const statusCodes = new Map<number, string>([
  [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'],
  [HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR'],
  [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
  [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  [HttpStatus.CONFLICT, 'CONFLICT'],
  [HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS'],
]);

export function apiErrorCodeForStatus(status: number): string {
  return statusCodes.get(status) ?? 'INTERNAL_ERROR';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException
      ? exception.getResponse()
      : null;
    const details = typeof body === 'object' && body !== null
      ? body as { code?: string; message?: string | string[] }
      : {};
    const message = typeof body === 'string'
      ? body
      : details.message ?? (
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : 'Request failed'
      );
    const code = details.code
      ?? (Array.isArray(message)
        ? 'VALIDATION_ERROR'
        : apiErrorCodeForStatus(status));

    response.status(status).json({
      statusCode: status,
      code,
      message,
    });
  }
}
