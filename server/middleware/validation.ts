
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Sanitize input middleware with enhanced security
export const sanitizeInput = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        // Multiple layers of sanitization
        let sanitized = DOMPurify.sanitize(obj);
        sanitized = validator.escape(sanitized);
        
        // Remove potential SQL injection patterns
        sanitized = sanitized.replace(/('|(\\')|(;|\\;)|(--)|(\*|\\*))/g, '');
        
        // Remove script tags and javascript: protocols
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        
        return sanitized.trim();
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize keys as well
          const sanitizedKey = validator.escape(key);
          sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    // Log suspicious activity
    const detectSuspiciousInput = (obj: any, path = ''): boolean => {
      if (typeof obj === 'string') {
        const suspicious = [
          /<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i,
          /union.*select/i, /drop.*table/i, /insert.*into/i, /delete.*from/i,
          /exec.*xp_/i, /sp_executesql/i, /eval\(/i, /function\(/i
        ];
        
        for (const pattern of suspicious) {
          if (pattern.test(obj)) {
            console.warn(`Suspicious input detected from IP ${req.ip}: ${pattern} in ${path}`);
            return true;
          }
        }
      }
      return false;
    };

    // Check for suspicious patterns before sanitization
    detectSuspiciousInput(req.body, 'body');
    detectSuspiciousInput(req.query, 'query');
    detectSuspiciousInput(req.params, 'params');

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next();
  };
};

// Schema validation middleware with enhanced error handling
export const validateSchema = (schema: z.ZodSchema, options: { 
  requireAuth?: boolean;
  logFailures?: boolean;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (options.logFailures) {
        console.warn(`Validation failed for IP ${req.ip}, Path: ${req.path}`, error);
      }
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid request data'
      });
    }
  };
};

// File upload validation middleware with security checks
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  scanForMalware?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

    if (!files) {
      return next();
    }

    let fileArray: Express.Multer.File[] = [];

    if (Array.isArray(files)) {
      fileArray = files;
    } else {
      fileArray = Object.values(files).flat();
    }

    // Check file count
    if (options.maxFiles && fileArray.length > options.maxFiles) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${options.maxFiles} files allowed`
      });
    }

    // Validate each file
    for (const file of fileArray) {
      // Check file size
      if (options.maxSize && file.size > options.maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} exceeds maximum size of ${options.maxSize} bytes`
        });
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} not allowed`
        });
      }

      // Check for executable files
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
      const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (dangerousExtensions.includes(fileExt)) {
        return res.status(400).json({
          success: false,
          message: `File type ${fileExt} is not allowed for security reasons`
        });
      }

      // Basic malware scan - check for suspicious patterns in filename
      const suspiciousPatterns = /(\.\.|\/|\\|<|>|\||\$|`|;)/;
      if (suspiciousPatterns.test(file.originalname)) {
        console.warn(`Suspicious filename detected: ${file.originalname} from IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid filename detected'
        });
      }
    }

    next();
  };
};

// Rate limiting middleware factory
export const createRateLimit = (options: { windowMs: number, max: number, message?: string }) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Remove custom keyGenerator to use default IP-based rate limiting
    // which properly handles IPv6 addresses
  });
};

// Enhanced validation schemas with security focus
export const commonSchemas = {
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),

  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),

  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  phoneNumber: z.string()
    .regex(/^(\+234|0)[789]\d{9}$/, 'Invalid Nigerian phone number')
    .min(11)
    .max(14),

  email: z.string()
    .email('Invalid email address')
    .max(254)
    .refine((email) => {
      // Additional email validation
      return validator.isEmail(email) && !email.includes('..') && !email.startsWith('.');
    }, 'Invalid email format'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),

  userId: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format'),

  amount: z.number()
    .positive('Amount must be positive')
    .max(10000000, 'Amount too large')
    .refine((val) => {
      // Check for reasonable decimal places
      return Number(val.toFixed(2)) === val;
    }, 'Invalid amount format'),

  description: z.string()
    .min(1)
    .max(1000)
    .refine((desc) => {
      // Check for suspicious content
      const suspicious = /<script|javascript:|data:|vbscript:/i;
      return !suspicious.test(desc);
    }, 'Invalid content detected'),

  url: z.string()
    .url('Invalid URL')
    .max(2048)
    .refine((url) => {
      // Only allow https and http protocols
      return url.startsWith('https://') || url.startsWith('http://');
    }, 'Only HTTP/HTTPS URLs allowed')
};

// Request logging middleware for security monitoring
export const securityLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        ip: req.ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent'],
        duration,
        userId: req.user?.id || null,
        timestamp: new Date().toISOString()
      };

      // Log suspicious activities
      if (res.statusCode >= 400 || duration > 5000) {
        console.warn('Suspicious request:', logData);
      }
    });

    next();
  };
};

// Additional validation schemas for enhanced security
export const enhancedCommonSchemas = {
  email: z.string().email().max(255),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Invalid Nigerian phone number'),
  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
  userId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
};

// Sanitization functions
export const sanitizers = {
  // Remove HTML tags and dangerous content
  sanitizeHtml: (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  },
  
  // Sanitize user input for database queries
  sanitizeString: (input: string): string => {
    return validator.escape(input.trim());
  },
  
  // Sanitize numeric input
  sanitizeNumber: (input: string): number => {
    const num = parseFloat(validator.escape(input));
    return isNaN(num) ? 0 : num;
  },
  
  // Sanitize boolean input
  sanitizeBoolean: (input: any): boolean => {
    return validator.toBoolean(String(input));
  },
  
  // Remove SQL injection patterns
  sanitizeSql: (input: string): string => {
    const dangerous = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi;
    return input.replace(dangerous, '');
  }
};

// Input validation middleware factory
export const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }
      
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }
      
      // Validate against schema
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data',
          errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      // Update request with validated data
      req.body = result.data.body;
      req.query = result.data.query;
      req.params = result.data.params;
      
      next();
    } catch (error) {
      console.error('Input validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};

// Recursive object sanitization
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizers.sanitizeString(obj);
  }
  
  if (typeof obj === 'number') {
    return obj;
  }
  
  if (typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizers.sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Specific validation schemas
export const authValidation = {
  register: validateInput(z.object({
    body: z.object({
      fullName: z.string().min(2).max(100),
      email: commonSchemas.email,
      phone: commonSchemas.phone,
      password: commonSchemas.password,
      role: z.enum(['CONSUMER', 'DRIVER', 'MERCHANT'])
    })
  })),
  
  login: validateInput(z.object({
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1).max(128)
    })
  }))
};

export const paymentValidation = {
  initiate: validateInput(z.object({
    body: z.object({
      amount: commonSchemas.amount,
      currency: z.enum(['NGN', 'USD']).default('NGN'),
      description: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional()
    })
  })),
  
  transfer: validateInput(z.object({
    body: z.object({
      recipientId: z.string().uuid(),
      amount: commonSchemas.amount,
      description: z.string().max(200).optional()
    })
  }))
};

export const locationValidation = {
  update: validateInput(z.object({
    body: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).optional(),
      heading: z.number().min(0).max(360).optional(),
      speed: z.number().min(0).optional()
    })
  }))
};

// File upload validation
export const fileValidation = {
  image: (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG and PNG allowed.'
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 5MB allowed.'
      });
    }
    
    next();
  }
};

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// CSRF Protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] as string;
    const sessionToken = req.session?.csrfToken;
    
    if (!token || token !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }
  }
  next();
};
