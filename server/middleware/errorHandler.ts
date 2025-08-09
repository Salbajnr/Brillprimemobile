
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

  // Log error
  console.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
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
