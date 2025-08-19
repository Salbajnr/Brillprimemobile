
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { auditLogs, securityLogs } from '../../shared/schema';

// PCI DSS Requirement 1 & 2: Network Security and System Configuration
export const pciSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers for PCI compliance
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: blob: https:; connect-src 'self' wss: ws:;");
  
  next();
};

// PCI DSS Requirement 3: Protect Stored Cardholder Data
export const sanitizeCardData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remove any potential card data from request body
    const sensitiveFields = ['cardNumber', 'cvv', 'cvc', 'expiryDate', 'pin'];
    
    function sanitizeObject(obj: any): any {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
          // Log attempt to send sensitive data
          console.warn(`Attempt to send sensitive card data field: ${key} from IP: ${req.ip}`);
          
          // Replace with masked value
          if (typeof value === 'string' && value.length > 4) {
            (sanitized as any)[key] = '*'.repeat(value.length - 4) + value.slice(-4);
          } else {
            (sanitized as any)[key] = '***REDACTED***';
          }
        } else {
          (sanitized as any)[key] = typeof value === 'object' ? sanitizeObject(value) : value;
        }
      }
      
      return sanitized;
    }
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// PCI DSS Requirement 4: Encrypt Transmission of Cardholder Data
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure;
    
    if (!isHttps) {
      return res.status(400).json({
        success: false,
        message: 'HTTPS required for payment operations',
        code: 'HTTPS_REQUIRED'
      });
    }
  }
  
  next();
};

// PCI DSS Requirement 8: Identify and Authenticate Access
export const enhancedPaymentAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for payment operations'
      });
    }

    const userId = req.session.userId;
    
    // Check for recent authentication
    const recentAuth = req.session.lastAuthTime;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    if (!recentAuth || recentAuth < fiveMinutesAgo) {
      return res.status(401).json({
        success: false,
        message: 'Recent authentication required for payment operations',
        code: 'REAUTH_REQUIRED'
      });
    }

    // Log payment access attempt
    await db.insert(securityLogs).values({
      userId,
      action: 'PAYMENT_ACCESS',
      details: JSON.stringify({
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      severity: 'INFO'
    });

    next();
    
  } catch (error) {
    console.error('Payment authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed'
    });
  }
};

// PCI DSS Requirement 10: Log and Monitor All Access
export const pciAuditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  const requestId = crypto.randomUUID();
  const logData = {
    requestId,
    userId: req.session?.userId || null,
    method: req.method,
    path: req.path,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || '',
    timestamp: new Date()
  };

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log response for payment-related endpoints
    if (req.path.includes('/payment') || req.path.includes('/transaction')) {
      db.insert(auditLogs).values({
        userId: req.session?.userId || null,
        action: `${req.method}_${req.path}`,
        resource: 'PAYMENT_ENDPOINT',
        resourceId: requestId,
        newValues: JSON.stringify({
          ...logData,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode < 400
        }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        success: res.statusCode < 400
      }).catch(err => console.error('Audit log error:', err));
    }
    
    return originalSend.call(this, data);
  };

  next();
};

// PCI DSS Requirement 6: Develop and Maintain Secure Systems
export const validatePaymentEndpoint = (req: Request, res: Response, next: NextFunction) => {
  // Validate critical payment parameters
  const criticalEndpoints = ['/api/payments/', '/api/transactions/', '/api/wallet/'];
  
  if (criticalEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    // Check for required security headers
    const requiredHeaders = ['user-agent', 'referer'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Required security headers missing',
        code: 'INVALID_REQUEST'
      });
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 1024 * 1024) { // 1MB limit
      return res.status(413).json({
        success: false,
        message: 'Request too large',
        code: 'REQUEST_TOO_LARGE'
      });
    }
  }
  
  next();
};

// Token validation for payment operations
export const validatePaymentToken = (req: Request, res: Response, next: NextFunction) => {
  const paymentToken = req.headers['x-payment-token'] as string;
  
  if (!paymentToken) {
    return res.status(400).json({
      success: false,
      message: 'Payment security token required',
      code: 'PAYMENT_TOKEN_MISSING'
    });
  }

  // Validate token format and expiry
  try {
    const tokenData = JSON.parse(Buffer.from(paymentToken, 'base64').toString());
    const tokenAge = Date.now() - tokenData.timestamp;
    
    if (tokenAge > 300000) { // 5 minutes
      return res.status(400).json({
        success: false,
        message: 'Payment token expired',
        code: 'PAYMENT_TOKEN_EXPIRED'
      });
    }
    
    req.paymentTokenData = tokenData;
    next();
    
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment token',
      code: 'PAYMENT_TOKEN_INVALID'
    });
  }
};

// Extend Request interface for payment token data
declare global {
  namespace Express {
    interface Request {
      paymentTokenData?: any;
    }
  }
}
