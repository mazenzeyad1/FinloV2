import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from './app-logger.service';

/**
 * Middleware to log incoming HTTP requests and outgoing responses
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const logger = this.logger;

    // Log outgoing response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const userId = (req as any).user?.id || 'anonymous';

      // Don't log passwords or sensitive data
      const safeMethod = method;
      const safeUrl = originalUrl.replace(/password=.*?(&|$)/gi, 'password=***&');

      // Log successful requests
      if (statusCode < 400) {
        logger.logRequest(safeMethod, safeUrl, statusCode, duration, {
          ip,
          userId,
        });
      } else {
        logger.logRequestError(safeMethod, safeUrl, statusCode, 'HTTP Error', {
          ip,
          userId,
        });
      }

      res.send = originalSend;
      return res.send(data);
    };

    next();
  }
}
