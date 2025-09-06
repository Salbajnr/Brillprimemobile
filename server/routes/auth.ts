import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { users, mfaTokens } from '../../shared/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

// JWT utility functions
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

function generateTokens(user: any) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { token, refreshToken };
}

function standardAuthResponse(user: any) {
  const { token, refreshToken } = generateTokens(user);
  
  return {
    success: true,
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.toLowerCase()
    }
  };
}

// Extend the session interface to include userId and user properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      userId: string;
      email: string;
      fullName: string;
      role: string;
      isVerified: boolean;
      profilePicture?: string;
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
  role: z.enum(['CONSUMER', 'DRIVER', 'MERCHANT', 'ADMIN']).default('CONSUMER')
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

const oauthSchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  token: z.string(),
  email: z.string().email().optional(),
  fullName: z.string().optional()
});

const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(5)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
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

    // Return JWT response
    res.json(standardAuthResponse(user));
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
    const newUsers = await db
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

    const newUser = newUsers[0];

    // Generate OTP for email verification
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    await db
      .insert(mfaTokens)
      .values({
        userId: newUser.id,
        token: hashedOtp,
        method: 'EMAIL',
        expiresAt,
        isUsed: false
      });

    // Send OTP email
    try {
      const { emailService } = await import('../services/email');
      const emailSent = await emailService.sendOTP(userData.email, otpCode, userData.fullName);

      if (!emailSent) {
        console.warn('Failed to send OTP email, but user was created');
      }
    } catch (emailError) {
      console.error('Email service error:', emailError);
    }

    // Return JWT response with email verification requirement
    const response = standardAuthResponse(newUser);
    response.requiresEmailVerification = true;
    response.user.isVerified = false;
    
    res.json(response);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      });
    }
    
    res.json(standardAuthResponse(user));
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid refresh token' 
    });
  }
});

// OAuth login endpoint  
router.post('/oauth', async (req, res) => {
  try {
    const { provider, token, email, fullName } = oauthSchema.parse(req.body);
    
    // In a real implementation, verify the OAuth token with the provider
    // For now, create/login user based on email
    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email and fullName required for OAuth login'
      });
    }
    
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      // Create new user from OAuth
      const newUsers = await db
        .insert(users)
        .values({
          email,
          fullName,
          role: 'CONSUMER',
          passwordHash: '', // OAuth users don't have passwords
          isVerified: true, // OAuth users are pre-verified
          createdAt: new Date()
        })
        .returning();
      user = newUsers[0];
    }
    
    res.json(standardAuthResponse(user));
  } catch (error: any) {
    console.error('OAuth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OAuth login failed' 
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = otpSchema.parse(req.body);
    
    // Find user
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
    
    // Hash provided OTP and check against stored hash
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    const [token] = await db
      .select()
      .from(mfaTokens)
      .where(
        and(
          eq(mfaTokens.userId, user.id),
          eq(mfaTokens.token, hashedOtp),
          eq(mfaTokens.isUsed, false),
          gte(mfaTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    // Mark token as used
    await db
      .update(mfaTokens)
      .set({ isUsed: true })
      .where(eq(mfaTokens.id, token.id));
    
    // Mark user as verified
    await db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, user.id));
    
    // Get updated user
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    res.json(standardAuthResponse(updatedUser));
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OTP verification failed' 
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }
    
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await db
      .insert(mfaTokens)
      .values({
        userId: user.id,
        token: hashedToken,
        method: 'PASSWORD_RESET',
        expiresAt,
        isUsed: false
      });
    
    // Send password reset email
    try {
      const { emailService } = await import('../services/email');
      await emailService.sendPasswordReset(email, resetToken, user.fullName);
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }
    
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    // Verify user still exists in database
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
        role: user.role,
        isVerified: user.isVerified || false
      }
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user information' 
    });
  }
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

    // Enhanced OTP validation for production
    const [storedOtp] = await db
      .select()
      .from(mfaTokens)
      .where(and(
        eq(mfaTokens.userId, user.id),
        eq(mfaTokens.method, 'EMAIL'),
        gte(mfaTokens.expiresAt, new Date()),
        eq(mfaTokens.isUsed, false)
      ))
      .orderBy(desc(mfaTokens.createdAt))
      .limit(1);

    if (storedOtp) {
      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      if (hashedOtp === storedOtp.token) {
        // Valid OTP - mark user as verified
        await db
          .update(users)
          .set({ isVerified: true })
          .where(eq(users.id, user.id));

        // Mark OTP as used
        await db
          .update(mfaTokens)
          .set({ isUsed: true, usedAt: new Date() })
          .where(eq(mfaTokens.id, storedOtp.id));

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
    }

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
    const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    await db
      .insert(mfaTokens)
      .values({
        userId: user.id,
        token: hashedOtp,
        method: 'EMAIL',
        expiresAt,
        isUsed: false
      });

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

    // Store reset token in database with expiry
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await db
      .insert(mfaTokens)
      .values({
        userId: user.id,
        token: hashedToken,
        method: 'EMAIL', // Using EMAIL method for password reset
        expiresAt
      });

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

    // Validate token from database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [resetData] = await db
      .select({
        id: mfaTokens.id,
        userId: mfaTokens.userId,
        expiresAt: mfaTokens.expiresAt,
        isUsed: mfaTokens.isUsed
      })
      .from(mfaTokens)
      .where(and(
        eq(mfaTokens.token, hashedToken),
        eq(mfaTokens.method, 'EMAIL'),
        gte(mfaTokens.expiresAt, new Date()),
        eq(mfaTokens.isUsed, false)
      ))
      .limit(1);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (resetData.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has already been used'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, resetData.userId));

    // Mark reset token as used
    await db
      .update(mfaTokens)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(mfaTokens.id, resetData.id));

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

// Admin Login endpoint
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const [adminUser] = await db
      .select() // Changed to select() to match original usage pattern
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.role, 'ADMIN')
      ))
      .limit(1);

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash); // Corrected to use passwordHash

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Generate admin JWT token
    const token = jwt.sign(
      {
        id: adminUser.id,
        userId: adminUser.id.toString(), // Assuming userId is string in JWT payload
        email: adminUser.email,
        role: adminUser.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'fallback-secret', // Use JWT_SECRET from environment variables
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: adminUser.id,
          userId: adminUser.id.toString(),
          email: adminUser.email,
          fullName: adminUser.fullName,
          role: adminUser.role
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
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
      isVerified: newUser.isVerified || false,
      profilePicture: newUser.profilePicture
    };
    req.session.lastActivity = Date.now();
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.get('User-Agent');

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isVerified: newUser.isVerified || false
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
      isVerified: user.isVerified || false,
      profilePicture: user.profilePicture
    };
    req.session.lastActivity = Date.now();
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.get('User-Agent');

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified || false
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