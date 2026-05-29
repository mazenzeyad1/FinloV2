// Standard error codes for API responses
export const ERROR_CODES = {
  // Auth errors (1xxx)
  INVALID_CREDENTIALS: 'AUTH_001',
  EMAIL_ALREADY_IN_USE: 'AUTH_002',
  EMAIL_NOT_VERIFIED: 'AUTH_003',
  INVALID_OR_EXPIRED_TOKEN: 'AUTH_004',
  REFRESH_TOKEN_REVOKED: 'AUTH_005',
  UNAUTHORIZED: 'AUTH_006',

  // Validation errors (2xxx)
  VALIDATION_FAILED: 'VALIDATION_001',
  INVALID_INPUT: 'VALIDATION_002',

  // Resource errors (3xxx)
  RESOURCE_NOT_FOUND: 'RESOURCE_001',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_002',
  FORBIDDEN_ACCESS: 'RESOURCE_003',

  // Business logic errors (4xxx)
  INSUFFICIENT_FUNDS: 'BUSINESS_001',
  INVALID_STATE: 'BUSINESS_002',
  OPERATION_NOT_ALLOWED: 'BUSINESS_003',
  PLAID_SYNC_FAILED: 'BUSINESS_004',

  // External service errors (5xxx)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_001',
  EMAIL_SEND_FAILED: 'EXTERNAL_002',
  STRIPE_ERROR: 'EXTERNAL_003',
  PLAID_ERROR: 'EXTERNAL_004',

  // Server errors (6xxx)
  INTERNAL_SERVER_ERROR: 'SERVER_001',
  DATABASE_ERROR: 'SERVER_002',
  SERVICE_UNAVAILABLE: 'SERVER_003',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_001: 'Invalid email or password',
  AUTH_002: 'Email is already in use',
  AUTH_003: 'Email not verified',
  AUTH_004: 'Invalid or expired token',
  AUTH_005: 'Refresh token has been revoked',
  AUTH_006: 'Unauthorized access',

  VALIDATION_001: 'Validation failed',
  VALIDATION_002: 'Invalid input provided',

  RESOURCE_001: 'Resource not found',
  RESOURCE_002: 'Resource already exists',
  RESOURCE_003: 'Forbidden access to this resource',

  BUSINESS_001: 'Insufficient funds for this operation',
  BUSINESS_002: 'Invalid resource state for this operation',
  BUSINESS_003: 'This operation is not allowed',
  BUSINESS_004: 'Failed to sync with Plaid',

  EXTERNAL_001: 'External service error',
  EXTERNAL_002: 'Failed to send email',
  EXTERNAL_003: 'Payment processing error',
  EXTERNAL_004: 'Banking service error',

  SERVER_001: 'Internal server error',
  SERVER_002: 'Database error occurred',
  SERVER_003: 'Service temporarily unavailable',
};
