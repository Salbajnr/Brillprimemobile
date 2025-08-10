
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Create rate limiter with enhanced security
const createSecureRateLimit = (windowMs: number, max: number, message: string, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      // Use IP + User Agent for better tracking
      return `${req.ip}_${req.headers['user-agent'] || 'unknown'}`;
    },
    onLimitReached: (req: Request, res: Response) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, UA: ${req.headers['user-agent']}`);
    }
  });
};

// General API rate limiter - more restrictive
export const apiLimiter = createSecureRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // Reduced from 100 to 50 requests
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for authentication endpoints
export const authLimiter = createSecureRateLimit(
  15 * 60 * 1000, // 15 minutes
  3, // Very strict - only 3 attempts
  'Too many authentication attempts, please try again later.',
  true // Skip successful requests
);

// Payment endpoints rate limiter - very strict
export const paymentLimiter = createSecureRateLimit(
  60 * 1000, // 1 minute
  2, // Only 2 payment requests per minute
  'Too many payment attempts, please wait before trying again.'
);

// OTP verification rate limiter
export const otpLimiter = createSecureRateLimit(
  5 * 60 * 1000, // 5 minutes
  3, // Only 3 OTP attempts per 5 minutes
  'Too many OTP verification attempts, please wait before trying again.',
  true // Skip successful requests
);

// Password reset rate limiter
export const passwordResetLimiter = createSecureRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // Only 3 password reset attempts per hour
  'Too many password reset attempts, please try again later.'
);

// Registration rate limiter
export const registrationLimiter = createSecureRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // Only 3 registrations per hour per IP
  'Too many registration attempts, please try again later.'
);

// File upload rate limiter
export const uploadLimiter = createSecureRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 file uploads per hour
  'Too many file upload attempts, please try again later.'
);

// Admin endpoints rate limiter
export const adminLimiter = createSecureRateLimit(
  60 * 1000, // 1 minute
  10, // 10 admin requests per minute
  'Too many admin requests, please slow down.'
);

// Search rate limiter to prevent abuse
export const searchLimiter = createSecureRateLimit(
  60 * 1000, // 1 minute
  20, // 20 searches per minute
  'Too many search requests, please slow down.'
);

// Transaction viewing rate limiter
export const transactionViewLimiter = createSecureRateLimit(
  60 * 1000, // 1 minute
  30, // 30 transaction view requests per minute
  'Too many transaction requests, please slow down.'
);
