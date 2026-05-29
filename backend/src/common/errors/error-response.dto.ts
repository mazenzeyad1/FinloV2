/**
 * Standardized error response format for all API errors
 */
export class ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
    method?: string;
  };

  constructor(code: string, message: string, details?: Record<string, any>, path?: string, method?: string) {
    this.error = {
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      ...(path && { path }),
      ...(method && { method }),
    };
  }
}

/**
 * Standardized success response format (optional, for consistency)
 */
export class SuccessResponseDto<T = any> {
  data: T;
  meta?: {
    timestamp: string;
  };

  constructor(data: T, includeMeta = false) {
    this.data = data;
    if (includeMeta) {
      this.meta = { timestamp: new Date().toISOString() };
    }
  }
}
