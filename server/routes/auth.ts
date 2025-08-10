
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

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
        ...userData,
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

export default router;
