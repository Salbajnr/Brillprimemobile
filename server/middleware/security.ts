import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { validateEnvironment } from '../env-validation';

const env = validateEnvironment();

// Enhanced CORS Configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (env.NODE_ENV === 'development') {
      // Allow all origins in development
      return callback(null, true);
    }
    
    // Production CORS - restrict to specific domains
    const allowedOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : [];
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Support wildcard subdomains
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin.trim();
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

// Enhanced Helmet Security Headers
export const helmetConfig = helmet({
  contentSecurityPolicy: env.HELMET_CSP_ENABLED ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdn.tailwindcss.com'
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // For development - remove in production
        "'unsafe-eval'", // Required for Babel transpilation
        'https://js.paystack.co',
        'https://maps.googleapis.com',
        'https://connect.facebook.net',
        'https://unpkg.com',
        'https://cdn.tailwindcss.com'
      ],
      imgSrc: [
        "'self'", 
        'data:', 
        'blob:',
        'https://res.cloudinary.com',
        'https://maps.googleapis.com',
        'https://maps.gstatic.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      connectSrc: [
        "'self'",
        'https://api.paystack.co',
        'https://maps.googleapis.com',
        'wss://*.replit.app',
        'ws://localhost:*',
        'https://unpkg.com',
        env.WEBSOCKET_URL || 'wss://localhost:5000'
      ],
      frameSrc: [
        "'self'",
        'https://js.paystack.co'
      ]
    }
  } : false,
  
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Rate Limiting Configurations
export const generalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    message: 'Account temporarily locked. Please try again in 15 minutes.',
  },
  handler: (req, res) => {
    console.warn(`Auth rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts',
      message: 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.',
    });
  }
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.PAYMENT_RATE_LIMIT_MAX,
  message: {
    error: 'Payment rate limit exceeded',
    message: 'Too many payment attempts. Please wait before trying again.',
  },
  handler: (req, res) => {
    console.warn(`Payment rate limit exceeded for IP: ${req.ip}, User: ${(req.session as any)?.userId}`);
    res.status(429).json({
      success: false,
      error: 'Payment processing rate limit',
      message: 'Too many payment attempts. Please wait 1 minute before retrying.',
    });
  }
});

// API Key Rate Limiting (for external API calls)
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Higher limit for API keys
  skip: (req) => !req.headers['x-api-key'],
  message: {
    error: 'API rate limit exceeded',
    message: 'API key rate limit exceeded. Please check your usage.',
  }
});

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Request ID middleware for tracking
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=self');
  
  // Instance identification for load balancing
  res.setHeader('X-Instance-ID', process.env.REPL_ID || 'local');
  res.setHeader('X-Served-By', process.env.REPL_ID || 'local');
  res.setHeader('X-Load-Balancer', 'BrillPrime-LB');
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention - remove script tags and javascript:
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Trusted proxy configuration
export const setupTrustedProxies = (app: any) => {
  if (env.TRUSTED_PROXIES) {
    switch (env.TRUSTED_PROXIES.toLowerCase()) {
      case 'cloudflare':
        // Cloudflare IP ranges
        app.set('trust proxy', [
          'loopback',
          '173.245.48.0/20',
          '103.21.244.0/22',
          '103.22.200.0/22',
          '103.31.4.0/22',
          '141.101.64.0/18',
          '108.162.192.0/18',
          '190.93.240.0/20',
          '188.114.96.0/20',
          '197.234.240.0/22',
          '198.41.128.0/17',
          '162.158.0.0/15',
          '104.16.0.0/13',
          '104.24.0.0/14',
          '172.64.0.0/13',
          '131.0.72.0/22'
        ]);
        break;
      case 'all':
        app.set('trust proxy', true);
        break;
      default:
        // Custom proxy IPs
        app.set('trust proxy', env.TRUSTED_PROXIES.split(',').map(ip => ip.trim()));
    }
  }
};