
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AdminUser {
  adminId: number;
  userId: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      adminUser: AdminUser;
    }
  }
}

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'admin-secret-key'
    ) as AdminUser;

    // Check if user has admin role
    if (!['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR'].includes(decoded.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    req.adminUser = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminUser) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.adminUser.permissions.includes(permission) && req.adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    next();
  };
};
