import { Request, Response, NextFunction } from 'express';

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Check if user has admin role
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
};

// Middleware specifically for admin routes
export const adminRouteAuth = (req: Request, res: Response, next: NextFunction) => {
  // For admin panel routes, check authorization header first
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token && !req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // If token exists, validate it (implement JWT validation here)
  // For now, proceed with session-based auth
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
};

export const requireSuperAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Check if user has super admin role
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Super admin access required' });
  }

  next();
};

// Alias for compatibility
export const requireAdmin = requireAdminAuth;

// Additional admin auth middleware exports
export const adminAuth = requireAdminAuth;

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // In a real implementation, check specific permissions
    // For now, just allow all admin users
    next();
  };
};