import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Rate limiting configuration
 * Different limits for different endpoint categories
 */
export const rateLimitConfig = {
  auth: {
    ttl: 900, // 15 minutes
    limit: 5, // 5 attempts
  },
  api: {
    ttl: 60, // 1 minute
    limit: 100, // 100 requests per minute
  },
  public: {
    ttl: 3600, // 1 hour
    limit: 1000, // 1000 requests per hour
  },
};

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000,
      },
    ]),
  ],
})
export class ThrottleConfigModule {}
