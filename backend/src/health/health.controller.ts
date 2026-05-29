import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Health check endpoints
 * Used by monitoring systems and load balancers
 */
@SkipThrottle()
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'finlo-backend',
    };
  }

  @Get('ready')
  ready() {
    return {
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
}
