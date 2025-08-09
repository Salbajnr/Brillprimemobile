
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import rateLimit from 'express-rate-limit';
import { body, validationResult, ValidationChain } from 'express-validator';

// Enhanced validation middleware with better error handling
export function validateSchema<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

// Query parameter validation
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }
      next(error);
    }
  };
}

// Express-validator middleware wrapper
export function validateFields(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    next();
  };
}

// Sanitization middleware
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        return value
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
      
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      if (typeof value === 'object' && value !== null) {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      
      return value;
    };

    req.body = sanitizeValue(req.body);
    req.query = sanitizeValue(req.query);
    req.params = sanitizeValue(req.params);
    
    next();
  };
}

// File upload validation
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files) {
      return next();
    }
    
    const allFiles = Object.values(files).flat();
    
    // Check file count
    if (options.maxFiles && allFiles.length > options.maxFiles) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${options.maxFiles} files allowed`
      });
    }
    
    // Check each file
    for (const file of allFiles) {
      // Check file size
      if (options.maxSize && file.size > options.maxSize) {
        return res.status(400).json({
          success: false,
          error: `File ${file.originalname} exceeds maximum size of ${options.maxSize} bytes`
        });
      }
      
      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type ${file.mimetype} is not allowed`
        });
      }
    }
    
    next();
  };
}

// Rate limiting with validation
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Common validation schemas
export const commonSchemas = {
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).optional()
  }),
  
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  
  id: z.object({
    id: z.coerce.number().positive()
  }),
  
  uuid: z.object({
    id: z.string().uuid()
  }),
  
  search: z.object({
    q: z.string().min(1).max(100).trim(),
    type: z.enum(['all', 'merchants', 'products', 'users']).default('all')
  })
};
