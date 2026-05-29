import * as winston from 'winston';
import * as util from 'util';
import { Injectable, LoggerService } from '@nestjs/common';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Custom Winston-based logger service
 * Provides structured logging for FinloV2
 */
@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          isDev ? winston.format.colorize() : winston.format.uncolorize(),
          winston.format.printf(({ level, message, timestamp, ms, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}] ${message} ${ms}${metaStr ? ` ${metaStr}` : ''}`;
          }),
        ),
      }),
    ];

    // Add file transport in production
    if (!isDev) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      transports,
    });
  }

  log(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, any>) {
    this.logger.error(message, { context, stack: trace, ...meta });
  }

  warn(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.verbose(message, { context, ...meta });
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, meta?: Record<string, any>) {
    this.logger.info(`${method} ${path}`, {
      type: 'http_request',
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  /**
   * Log HTTP error
   */
  logRequestError(method: string, path: string, statusCode: number, error: string, meta?: Record<string, any>) {
    this.logger.error(`${method} ${path} - ${error}`, {
      type: 'http_error',
      method,
      path,
      statusCode,
      ...meta,
    });
  }

  /**
   * Log database query
   */
  logDatabaseQuery(query: string, duration: number, meta?: Record<string, any>) {
    this.logger.debug(`Database query executed in ${duration}ms`, {
      type: 'db_query',
      query,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  /**
   * Log security-relevant event (login, auth failure, permission denied, etc.)
   */
  logSecurityEvent(event: string, userId?: string, meta?: Record<string, any>) {
    this.logger.warn(`Security event: ${event}`, {
      type: 'security_event',
      event,
      userId,
      ...meta,
    });
  }
}
