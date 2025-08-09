
import { Request, Response, NextFunction } from 'express';
import { loggingService } from '../services/logging';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithTiming extends Request {
  startTime?: number;
  requestId?: string;
}

export function requestLoggerMiddleware() {
  return (req: RequestWithTiming, res: Response, next: NextFunction) => {
    // Add request ID
    req.requestId = uuidv4();
    req.headers['x-request-id'] = req.requestId;
    
    // Store request start time
    req.startTime = Date.now();
    
    // Store current request IP globally for logging service
    (global as any).currentRequestIP = req.ip || req.connection.remoteAddress;

    // Log request start
    loggingService.debug('Request started', {
      requestId: req.requestId,
      method: req.method,
      route: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - (req.startTime || Date.now());
      
      // Log the request completion
      loggingService.logRequest(req, res, responseTime);
      
      // Log slow requests
      if (responseTime > 5000) { // 5 seconds
        loggingService.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          route: req.path,
          responseTime,
          statusCode: res.statusCode,
          userId: req.user?.id
        });
      }

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

export function errorRequestLogger() {
  return (error: any, req: RequestWithTiming, res: Response, next: NextFunction) => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    loggingService.error('Request error', error, {
      requestId: req.requestId,
      method: req.method,
      route: req.path,
      responseTime,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    next(error);
  };
}

export function securityLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log authentication attempts
    if (req.path.includes('/auth/login')) {
      loggingService.logSecurity({
        event: 'LOGIN_ATTEMPT',
        userId: req.body?.email ? undefined : req.body?.userId,
        ip: req.ip || req.connection.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        details: {
          email: req.body?.email,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Log permission denied
    const originalStatus = res.status;
    res.status = function(code: number) {
      if (code === 403) {
        loggingService.logSecurity({
          event: 'PERMISSION_DENIED',
          userId: req.user?.id,
          ip: req.ip || req.connection.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
          details: {
            route: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          }
        });
      }
      return originalStatus.call(this, code);
    };

    next();
  };
}
