import { Module } from '@nestjs/common';
import { AppLogger } from './app-logger.service';
import { RequestLoggingMiddleware } from './request-logging.middleware';

@Module({
  providers: [AppLogger, RequestLoggingMiddleware],
  exports: [AppLogger, RequestLoggingMiddleware],
})
export class LoggerModule {}
