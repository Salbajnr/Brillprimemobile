import { Request, Response, NextFunction } from "express";

// Extend the session interface to include userId and user properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      userId: string;
      fullName: string;
      email: string;
      role: string;
      isVerified: boolean;
      profilePicture?: string;
    };
  }
}

// Extend the Request interface to support Passport.js-like methods
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: number;
        userId: string;
        fullName: string;
        email: string;
        role: string;
        isVerified: boolean;
        profilePicture?: string;
      };
    }
  }
}

// Authentication middleware that adds Passport.js-like methods to req
export function setupAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add isAuthenticated method
    req.isAuthenticated = () => {
      return !!(req.session?.userId && req.session?.user);
    };

    // Add user property from session
    if (req.session?.user) {
      req.user = req.session.user;
    }

    next();
  };
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware to require specific role
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}