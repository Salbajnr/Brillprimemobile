
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  error: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Import logging service
  const { loggingService } = await import('../services/logging');

  // Enhanced error logging with context
  loggingService.error('Request error occurred', error, {
    requestId: (req as any).requestId,
    userId: req.user?.id,
    userRole: req.user?.role,
    sessionId: req.sessionID,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    route: req.route?.path || req.path,
    method: req.method,
    metadata: {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    }
  });

  // Handle different error types
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  } else if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${error.message}`;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.message.includes('ENOENT')) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Service unavailable';
  }

  // Don't expose sensitive error details in production
  const response: any = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
