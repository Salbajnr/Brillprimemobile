
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';

// Create Redis client for rate limiting storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Custom rate limiter store using Redis
class RedisStore {
  constructor(private redis: Redis, private prefix: string = 'rl:') {}

  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const fullKey = `${this.prefix}${key}`;
    const current = await this.redis.incr(fullKey);
    
    if (current === 1) {
      // First request, set expiry
      await this.redis.expire(fullKey, 60); // 1 minute window
    }
    
    const ttl = await this.redis.ttl(fullKey);
    const resetTime = new Date(Date.now() + ttl * 1000);
    
    return { totalHits: current, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}

const store = new RedisStore(redis);

// Role-based rate limits
const RATE_LIMITS = {
  ADMIN: { windowMs: 60 * 1000, max: 1000 }, // 1000 requests per minute
  MERCHANT: { windowMs: 60 * 1000, max: 200 }, // 200 requests per minute
  DRIVER: { windowMs: 60 * 1000, max: 300 }, // 300 requests per minute
  CONSUMER: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
  GUEST: { windowMs: 60 * 1000, max: 20 } // 20 requests per minute for unauthenticated
};

// API-specific rate limits
const API_LIMITS = {
  '/api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 login attempts per 15 minutes
  '/api/auth/register': { windowMs: 60 * 60 * 1000, max: 3 }, // 3 registrations per hour
  '/api/payments': { windowMs: 60 * 1000, max: 10 }, // 10 payment requests per minute
  '/api/wallet/fund': { windowMs: 60 * 1000, max: 5 }, // 5 funding attempts per minute
  '/api/verification': { windowMs: 60 * 60 * 1000, max: 5 } // 5 verification attempts per hour
};

// Create dynamic rate limiter based on user role and endpoint
export const createRateLimiter = (options: {
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
} = {}) => {
  return async (req: Request, res: Response, next: Function) => {
    try {
      // Determine user role
      const userRole = req.session?.user?.role || 'GUEST';
      const userId = req.session?.user?.id;
      
      // Get rate limit for user role
      let rateLimit = RATE_LIMITS[userRole as keyof typeof RATE_LIMITS] || RATE_LIMITS.GUEST;
      
      // Check for API-specific limits
      const endpoint = req.path;
      for (const [pattern, limit] of Object.entries(API_LIMITS)) {
        if (endpoint.startsWith(pattern)) {
          rateLimit = limit;
          break;
        }
      }
      
      // Generate key for rate limiting
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `${userId || req.ip}:${userRole}:${endpoint}`;
      
      // Check rate limit
      const result = await store.incr(key);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimit.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, rateLimit.max - result.totalHits).toString(),
        'X-RateLimit-Reset': result.resetTime?.toISOString() || ''
      });
      
      if (result.totalHits > rateLimit.max) {
        // Rate limit exceeded
        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }
        
        // Log rate limit violation
        console.warn(`Rate limit exceeded for ${userRole} user ${userId || 'anonymous'} on ${endpoint}`);
        
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.resetTime
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiter fails
      next();
    }
  };
};

// Specific rate limiters
export const authLimiter = createRateLimiter({
  keyGenerator: (req) => `auth:${req.ip}`,
  onLimitReached: (req, res) => {
    console.warn(`Authentication rate limit exceeded from IP: ${req.ip}`);
  }
});

export const paymentLimiter = createRateLimiter({
  keyGenerator: (req) => `payment:${req.session?.user?.id || req.ip}`,
  skipSuccessfulRequests: true
});

export const generalLimiter = createRateLimiter();

// Cleanup function
export const cleanupRateLimitStore = async () => {
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
