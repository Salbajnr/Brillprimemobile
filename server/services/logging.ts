
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request, Response } from 'express';
import { performance } from 'perf_hooks';

export interface LogContext {
  userId?: number;
  userRole?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  errorCode?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface SecurityLogData {
  event: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED';
  userId?: number;
  ip: string;
  userAgent: string;
  details?: Record<string, any>;
}

export interface PerformanceLogData {
  operation: string;
  duration: number;
  success: boolean;
  resourceUsage?: {
    memory?: number;
    cpu?: number;
  };
  metadata?: Record<string, any>;
}

export interface BusinessLogData {
  event: 'ORDER_CREATED' | 'PAYMENT_PROCESSED' | 'DELIVERY_COMPLETED' | 'DISPUTE_RAISED' | 'REFUND_ISSUED';
  userId: number;
  amount?: number;
  orderId?: string;
  metadata?: Record<string, any>;
}

class LoggingService {
  private logger: winston.Logger;
  private securityLogger: winston.Logger;
  private performanceLogger: winston.Logger;
  private businessLogger: winston.Logger;
  private errorLogger: winston.Logger;

  constructor() {
    // Main application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true
        })
      ]
    });

    // Security events logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true
        })
      ]
    });

    // Performance logger
    this.performanceLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/performance-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          zippedArchive: true
        })
      ]
    });

    // Business events logger
    this.businessLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/business-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          zippedArchive: true
        })
      ]
    });

    // Error logger
    this.errorLogger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/errors-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true
        })
      ]
    });
  }

  // Main logging methods
  info(message: string, context?: LogContext) {
    this.logger.info(message, context);
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const logData = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    };
    
    this.logger.error(message, logData);
    this.errorLogger.error(message, logData);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context);
  }

  // Security logging
  logSecurity(data: SecurityLogData) {
    this.securityLogger.info('Security Event', {
      event: data.event,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      timestamp: new Date().toISOString(),
      ...data.details
    });
  }

  // Performance logging
  logPerformance(data: PerformanceLogData) {
    this.performanceLogger.info('Performance Metric', {
      operation: data.operation,
      duration: data.duration,
      success: data.success,
      timestamp: new Date().toISOString(),
      resourceUsage: data.resourceUsage,
      ...data.metadata
    });
  }

  // Business event logging
  logBusiness(data: BusinessLogData) {
    this.businessLogger.info('Business Event', {
      event: data.event,
      userId: data.userId,
      amount: data.amount,
      orderId: data.orderId,
      timestamp: new Date().toISOString(),
      ...data.metadata
    });
  }

  // HTTP request logging
  logRequest(req: Request, res: Response, responseTime: number) {
    const context: LogContext = {
      userId: req.user?.id,
      userRole: req.user?.role,
      sessionId: req.sessionID,
      requestId: req.headers['x-request-id'] as string,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      route: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      metadata: {
        query: req.query,
        body: this.sanitizeRequestBody(req.body),
        headers: this.sanitizeHeaders(req.headers)
      }
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, `${req.method} ${req.path} - ${res.statusCode}`, context);
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, error?: Error) {
    const logData = {
      operation,
      table,
      duration,
      success,
      timestamp: new Date().toISOString(),
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined
    };

    if (success) {
      this.logger.debug(`Database ${operation} on ${table}`, logData);
    } else {
      this.logger.error(`Database ${operation} failed on ${table}`, logData);
    }

    this.logPerformance({
      operation: `db_${operation}_${table}`,
      duration,
      success,
      metadata: { table }
    });
  }

  // WebSocket event logging
  logWebSocketEvent(event: string, userId?: number, data?: any) {
    this.logger.info('WebSocket Event', {
      event,
      userId,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data)
    });
  }

  // Payment logging
  logPayment(event: 'INITIATED' | 'SUCCESS' | 'FAILED', amount: number, userId: number, paymentMethod: string, transactionId?: string, error?: string) {
    const logData = {
      event: `PAYMENT_${event}`,
      amount,
      userId,
      paymentMethod,
      transactionId,
      error,
      timestamp: new Date().toISOString()
    };

    this.businessLogger.info('Payment Event', logData);
    
    if (event === 'FAILED') {
      this.error('Payment failed', new Error(error || 'Unknown payment error'), {
        userId,
        metadata: { amount, paymentMethod, transactionId }
      });
    }
  }

  // API rate limiting logging
  logRateLimit(ip: string, route: string, limit: number, current: number) {
    this.logSecurity({
      event: 'SUSPICIOUS_ACTIVITY',
      ip,
      userAgent: '',
      details: {
        type: 'RATE_LIMIT_EXCEEDED',
        route,
        limit,
        current,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Audit trail logging
  logAudit(action: string, userId: number, targetType: string, targetId: string, changes?: Record<string, any>) {
    this.businessLogger.info('Audit Trail', {
      action,
      userId,
      targetType,
      targetId,
      changes,
      timestamp: new Date().toISOString(),
      ip: this.getCurrentRequestIP()
    });
  }

  // Helper methods
  private sanitizeRequestBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'pin', 'otp'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'pin', 'otp', 'ssn', 'creditCard'];
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj: any) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  private getCurrentRequestIP(): string {
    // This would be set by middleware
    return (global as any).currentRequestIP || 'unknown';
  }

  // Performance monitoring
  startTimer(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.logPerformance({
        operation,
        duration,
        success: true
      });
    };
  }

  // Memory usage monitoring
  logMemoryUsage() {
    const usage = process.memoryUsage();
    this.logPerformance({
      operation: 'memory_usage',
      duration: 0,
      success: true,
      resourceUsage: {
        memory: usage.heapUsed / 1024 / 1024 // MB
      },
      metadata: {
        rss: usage.rss / 1024 / 1024,
        heapTotal: usage.heapTotal / 1024 / 1024,
        heapUsed: usage.heapUsed / 1024 / 1024,
        external: usage.external / 1024 / 1024
      }
    });
  }

  // Error aggregation
  logErrorWithContext(error: Error, context: string, metadata?: Record<string, any>) {
    this.error(`Error in ${context}`, error, {
      metadata: {
        context,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Shutdown logging
  async gracefulShutdown() {
    this.info('Application shutting down gracefully');
    
    // Wait for logs to be written
    await new Promise(resolve => {
      setTimeout(resolve, 1000);
    });
  }
}

export const loggingService = new LoggingService();
