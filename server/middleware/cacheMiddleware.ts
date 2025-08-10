
import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request, res: Response) => boolean;
  varyByUser?: boolean;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `api:${req.method}:${req.originalUrl}`,
    skipCache = () => false,
    varyByUser = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or when skipCache returns true
    if (req.method !== 'GET' || skipCache(req, res)) {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey = keyGenerator(req);
      if (varyByUser && req.session?.userId) {
        cacheKey = `${cacheKey}:user:${req.session.userId}`;
      }

      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      if (cachedResponse) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(console.error);
        }
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Specific cache configurations for different endpoints
export const dashboardCache = cacheMiddleware({
  ttl: 600, // 10 minutes
  keyGenerator: (req) => `dashboard:${req.originalUrl}`,
  varyByUser: true
});

export const productsCache = cacheMiddleware({
  ttl: 900, // 15 minutes
  keyGenerator: (req) => `products:${req.originalUrl}`,
  skipCache: (req) => req.query.live === 'true'
});

export const analyticsCache = cacheMiddleware({
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `analytics:${req.originalUrl}`,
  varyByUser: true
});

export const locationCache = cacheMiddleware({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => `location:${req.originalUrl}`,
  skipCache: (req) => req.query.realtime === 'true'
});

// Cache invalidation helper
export function invalidateCache(patterns: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cacheService.invalidatePattern(pattern).catch(console.error);
        });
      }
    });
    next();
  };
}
