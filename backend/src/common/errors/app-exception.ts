import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ErrorCode, ERROR_CODES, ERROR_MESSAGES } from './error-codes';

// Re-export for convenience
export { ERROR_CODES, ERROR_MESSAGES, ErrorCode };

/**
 * Custom AppException class for standardized error handling
 * Can be thrown from anywhere and will be caught by AppExceptionFilter
 */
export class AppException extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message?: string,
    public details?: Record<string, any>,
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'AppException';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper functions for common exceptions
export const AppExceptions = {
  badRequest: (code: ErrorCode, details?: Record<string, any>) =>
    new AppException(code, 400, ERROR_MESSAGES[code], details),

  unauthorized: (code: ErrorCode = ERROR_CODES.UNAUTHORIZED, details?: Record<string, any>) =>
    new AppException(code, 401, ERROR_MESSAGES[code], details),

  forbidden: (code: ErrorCode = ERROR_CODES.FORBIDDEN_ACCESS, details?: Record<string, any>) =>
    new AppException(code, 403, ERROR_MESSAGES[code], details),

  notFound: (code: ErrorCode = ERROR_CODES.RESOURCE_NOT_FOUND, details?: Record<string, any>) =>
    new AppException(code, 404, ERROR_MESSAGES[code], details),

  conflict: (code: ErrorCode = ERROR_CODES.RESOURCE_ALREADY_EXISTS, details?: Record<string, any>) =>
    new AppException(code, 409, ERROR_MESSAGES[code], details),

  internalError: (code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR, details?: Record<string, any>) =>
    new AppException(code, 500, ERROR_MESSAGES[code], details),

  externalError: (code: ErrorCode, details?: Record<string, any>) =>
    new AppException(code, 502, ERROR_MESSAGES[code], details),
};

/**
 * Convert NestJS exceptions to AppException
 */
export function convertNestExceptionToAppException(exception: any): AppException | null {
  if (exception instanceof UnauthorizedException) {
    return new AppException(ERROR_CODES.UNAUTHORIZED, 401, exception.message);
  }
  if (exception instanceof ForbiddenException) {
    return new AppException(ERROR_CODES.FORBIDDEN_ACCESS, 403, exception.message);
  }
  if (exception instanceof NotFoundException) {
    return new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, 404, exception.message);
  }
  if (exception instanceof BadRequestException) {
    return new AppException(ERROR_CODES.INVALID_INPUT, 400, exception.message);
  }
  return null;
}
