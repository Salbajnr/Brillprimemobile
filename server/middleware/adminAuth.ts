import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { adminUsers } from '../../shared/schema';

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
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret-key') as any;

    // Get admin user from database
    const adminUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, decoded.adminId)
    });

    if (!adminUser) {
      return res.status(401).json({ success: false, message: 'Admin user not found' });
    }

    // Check if admin is still active
    if (adminUser.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Admin account is not active' });
    }

    // Add admin info to request for use in admin routes
    req.user = {
      adminId: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions || []
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    
    console.error('Admin authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};