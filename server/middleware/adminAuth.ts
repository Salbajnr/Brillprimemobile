import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users, adminUsers } from '../../shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized - Please login first' });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
    });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    // Check if user is an admin
    const adminUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.userId, user.userId)
    });

    if (!adminUser) {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    // Add user and admin info to request for use in admin routes
    req.user = {
      ...user,
      adminRole: adminUser.role,
      adminPermissions: adminUser.permissions
    };
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};