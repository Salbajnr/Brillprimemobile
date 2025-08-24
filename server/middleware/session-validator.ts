
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip session validation for certain routes
    const skipRoutes = ['/auth/login', '/auth/register', '/auth/signin', '/auth/signup', '/health'];
    const isSkipRoute = skipRoutes.some(route => req.path.includes(route));
    
    if (isSkipRoute) {
      return next();
    }

    // If session exists, validate it
    if (req.session.userId) {
      // Check if session is too old (24 hours)
      const sessionAge = Date.now() - (req.session.lastActivity || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge > maxAge) {
        req.session.destroy((err) => {
          if (err) console.error('Session destruction error:', err);
        });
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }

      // Verify user still exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!user) {
        req.session.destroy((err) => {
          if (err) console.error('Session destruction error:', err);
        });
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update last activity
      req.session.lastActivity = Date.now();
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next();
  }
};

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};
