import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppException, convertNestExceptionToAppException } from './app-exception';
import { ErrorResponseDto } from './error-response.dto';
import { ERROR_CODES } from './error-codes';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private logger = new Logger(AppExceptionFilter.name);

  constructor(private httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let appException: AppException | null = null;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof AppException) {
      appException = exception;
      statusCode = exception.statusCode;
    } else {
      // Try to convert NestJS exceptions
      appException = convertNestExceptionToAppException(exception as any);
      if (appException) {
        statusCode = appException.statusCode;
      } else {
        // Unknown exception
        appException = new AppException(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          HttpStatus.INTERNAL_SERVER_ERROR,
          'An unexpected error occurred',
        );
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        // Log unknown errors for debugging
        if (exception instanceof Error) {
          this.logger.error(
            `Unhandled exception: ${exception.message}`,
            exception.stack,
            'AppExceptionFilter',
          );
        }
      }
    }

    const errorResponse = new ErrorResponseDto(
      appException.code,
      appException.message,
      appException.details,
      request.url,
      request.method,
    );

    httpAdapter.reply(response, errorResponse, statusCode);
  }
}
