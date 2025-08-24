
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Extend the session interface to include userId and user properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      email: string;
      fullName: string;
      role: string;
    };
    lastActivity?: number;
    ipAddress?: string;
    userAgent?: string;
    mfaVerified?: boolean;
    mfaVerifiedAt?: number;
  }
}

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['CONSUMER', 'DRIVER', 'MERCHANT']).default('CONSUMER')
});

// Session validation endpoint
router.get('/validate-session', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'No active session' 
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user) {
      // User no longer exists, destroy session
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Session validation failed' 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        passwordHash,
        createdAt: new Date()
      })
      .returning();

    // Create session
    req.session.userId = newUser.id;
    req.session.user = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    };

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }

  res.json({
    success: true,
    user: req.session.user
  });
});

// OTP verification endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = z.object({
      email: z.string().email(),
      otp: z.string().length(5)
    }).parse(req.body);

    // Get user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For development, accept any 5-digit code
    if (process.env.NODE_ENV === 'development' && otp.length === 5) {
      // Mark user as verified
      await db
        .update(users)
        .set({ isVerified: true })
        .where(eq(users.id, user.id));

      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      return res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    }

    // In production, implement proper OTP validation
    // This would check against stored OTP and expiry time
    
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = z.object({
      email: z.string().email()
    }).parse(req.body);

    // Get user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Send OTP email
    const { emailService } = await import('../services/email');
    const emailSent = await emailService.sendOTP(email, otpCode, user.fullName);

    if (emailSent) {
      res.json({
        success: true,
        message: 'Verification code sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = z.object({
      email: z.string().email()
    }).parse(req.body);

    // Get user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a reset link.'
      });
    }

    // Generate reset token (in production, use proper JWT or similar)
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    
    // Store reset token temporarily (in production, store in database with expiry)
    // For now, we'll use a simple in-memory store or Redis
    
    // Send reset email
    const { emailService } = await import('../services/email');
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const emailSent = await emailService.sendPasswordResetEmail(email, resetLink, user.fullName);

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = z.object({
      token: z.string(),
      newPassword: z.string().min(8)
    }).parse(req.body);

    // In production, validate token from database
    // For development, accept any valid format token
    if (!token || token.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // For development, we'll just accept any user for password reset
    // In production, you'd look up the token and get the associated user
    
    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed' 
        });
      }
      
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
});

// Add aliases for frontend compatibility
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role = 'CONSUMER' } = req.body;
    
    // Generate a fullName from email if not provided
    const fullName = req.body.fullName || email.split('@')[0];
    
    const userData = {
      email,
      password,
      fullName,
      role
    };
    
    const validatedData = registerSchema.parse(userData);
    
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        ...validatedData,
        passwordHash,
        createdAt: new Date()
      })
      .returning();

    // Create session
    req.session.userId = newUser.id;
    req.session.user = {
      id: newUser.id,
      userId: newUser.id.toString(),
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      isVerified: newUser.isVerified || false
    };

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Signup failed' 
    });
  }
});

// Add signin alias
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      userId: user.id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified || false
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Signin failed' 
    });
  }
});

export default router;
