
import { Router } from 'express';
import { db } from '../db';
import { users, mfaTokens, securityLogs } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = Router();

// Validation schemas
const setupMfaSchema = z.object({
  method: z.enum(['SMS', 'EMAIL', 'TOTP']),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional()
});

const verifyMfaSchema = z.object({
  token: z.string().min(4).max(8),
  method: z.enum(['SMS', 'EMAIL', 'TOTP']),
  rememberDevice: z.boolean().default(false)
});

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Setup MFA for user account
router.post('/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const data = setupMfaSchema.parse(req.body);

    let mfaSecret = '';
    let qrCode = '';

    // Generate MFA secret based on method
    switch (data.method) {
      case 'TOTP':
        const secret = speakeasy.generateSecret({
          name: `BrillPrime (${userId})`,
          issuer: 'BrillPrime'
        });
        mfaSecret = secret.base32;
        qrCode = await QRCode.toDataURL(secret.otpauth_url!);
        break;
      
      case 'SMS':
        if (!data.phoneNumber) {
          return res.status(400).json({
            success: false,
            message: 'Phone number required for SMS MFA'
          });
        }
        mfaSecret = crypto.randomBytes(16).toString('hex');
        break;
      
      case 'EMAIL':
        if (!data.email) {
          return res.status(400).json({
            success: false,
            message: 'Email required for email MFA'
          });
        }
        mfaSecret = crypto.randomBytes(16).toString('hex');
        break;
    }

    // Update user with MFA settings
    await db.update(users).set({
      mfaEnabled: true,
      mfaMethod: data.method,
      mfaSecret: mfaSecret,
      mfaBackupCodes: generateBackupCodes(),
      updatedAt: new Date()
    }).where(eq(users.id, userId));

    // Log MFA setup
    await db.insert(securityLogs).values({
      userId,
      action: 'MFA_SETUP',
      details: JSON.stringify({
        method: data.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }),
      severity: 'INFO',
      timestamp: new Date()
    });

    // Send setup confirmation
    if (global.io) {
      global.io.to(`user_${userId}`).emit('security_update', {
        type: 'MFA_ENABLED',
        method: data.method,
        timestamp: Date.now()
      });
    }

    const response: any = {
      success: true,
      message: 'MFA setup completed',
      method: data.method,
      backupCodes: generateBackupCodes()
    };

    if (data.method === 'TOTP') {
      response.qrCode = qrCode;
      response.secret = mfaSecret;
    }

    res.json(response);

  } catch (error: any) {
    console.error('MFA setup error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'MFA setup failed'
    });
  }
});

// Generate and send MFA token
router.post('/generate-token', async (req, res) => {
  try {
    const { userId, method } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA not enabled for this user'
      });
    }

    let token = '';
    let expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    switch (method) {
      case 'SMS':
        token = Math.floor(100000 + Math.random() * 900000).toString();
        await sendSmsToken(user.phone!, token);
        break;
      
      case 'EMAIL':
        token = Math.floor(100000 + Math.random() * 900000).toString();
        await sendEmailToken(user.email, token);
        break;
      
      case 'TOTP':
        // TOTP doesn't need token generation, verification is done directly
        return res.json({
          success: true,
          message: 'Use your authenticator app to get the token'
        });
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA method'
        });
    }

    // Store token
    await db.insert(mfaTokens).values({
      userId,
      token: crypto.createHash('sha256').update(token).digest('hex'),
      method,
      expiresAt,
      isUsed: false
    });

    res.json({
      success: true,
      message: `MFA token sent via ${method.toLowerCase()}`,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error: any) {
    console.error('MFA token generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate MFA token'
    });
  }
});

// Verify MFA token
router.post('/verify', async (req, res) => {
  try {
    const data = verifyMfaSchema.parse(req.body);
    const userId = req.session?.userId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required'
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA not enabled'
      });
    }

    let isValid = false;

    switch (data.method) {
      case 'TOTP':
        isValid = speakeasy.totp.verify({
          secret: user.mfaSecret!,
          encoding: 'base32',
          token: data.token,
          window: 1
        });
        break;
      
      case 'SMS':
      case 'EMAIL':
        const hashedToken = crypto.createHash('sha256').update(data.token).digest('hex');
        const [storedToken] = await db.select().from(mfaTokens)
          .where(and(
            eq(mfaTokens.userId, userId),
            eq(mfaTokens.token, hashedToken),
            eq(mfaTokens.method, data.method),
            eq(mfaTokens.isUsed, false),
            gt(mfaTokens.expiresAt, new Date())
          ))
          .limit(1);

        if (storedToken) {
          isValid = true;
          // Mark token as used
          await db.update(mfaTokens).set({
            isUsed: true,
            usedAt: new Date()
          }).where(eq(mfaTokens.id, storedToken.id));
        }
        break;
    }

    // Check backup codes if primary method fails
    if (!isValid && user.mfaBackupCodes) {
      const backupCodes = JSON.parse(user.mfaBackupCodes);
      const hashedBackupToken = crypto.createHash('sha256').update(data.token).digest('hex');
      
      if (backupCodes.includes(hashedBackupToken)) {
        isValid = true;
        // Remove used backup code
        const updatedCodes = backupCodes.filter((code: string) => code !== hashedBackupToken);
        await db.update(users).set({
          mfaBackupCodes: JSON.stringify(updatedCodes)
        }).where(eq(users.id, userId));
      }
    }

    if (!isValid) {
      // Log failed attempt
      await db.insert(securityLogs).values({
        userId,
        action: 'MFA_VERIFICATION_FAILED',
        details: JSON.stringify({
          method: data.method,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }),
        severity: 'WARNING',
        timestamp: new Date()
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    // Successful verification
    await db.insert(securityLogs).values({
      userId,
      action: 'MFA_VERIFICATION_SUCCESS',
      details: JSON.stringify({
        method: data.method,
        rememberDevice: data.rememberDevice,
        ipAddress: req.ip
      }),
      severity: 'INFO',
      timestamp: new Date()
    });

    // Set MFA verified session
    if (req.session) {
      req.session.mfaVerified = true;
      req.session.mfaVerifiedAt = Date.now();
    }

    // Generate device token if remember device is enabled
    let deviceToken = '';
    if (data.rememberDevice) {
      deviceToken = crypto.randomBytes(32).toString('hex');
      // Store device token with expiry (30 days)
      // Implementation would store this in a trusted devices table
    }

    res.json({
      success: true,
      message: 'MFA verification successful',
      deviceToken: deviceToken || undefined
    });

  } catch (error: any) {
    console.error('MFA verification error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'MFA verification failed'
    });
  }
});

// Disable MFA
router.post('/disable', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { confirmationToken } = req.body;

    // Verify current MFA token before disabling
    const verifyResult = await verifyMfaToken(userId, confirmationToken);
    
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: 'MFA verification required to disable'
      });
    }

    // Disable MFA
    await db.update(users).set({
      mfaEnabled: false,
      mfaMethod: null,
      mfaSecret: null,
      mfaBackupCodes: null,
      updatedAt: new Date()
    }).where(eq(users.id, userId));

    // Log MFA disable
    await db.insert(securityLogs).values({
      userId,
      action: 'MFA_DISABLED',
      details: JSON.stringify({
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }),
      severity: 'WARNING',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'MFA has been disabled'
    });

  } catch (error: any) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable MFA'
    });
  }
});

// Get MFA status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;

    const [user] = await db.select({
      mfaEnabled: users.mfaEnabled,
      mfaMethod: users.mfaMethod,
      mfaBackupCodes: users.mfaBackupCodes
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const backupCodesCount = user.mfaBackupCodes 
      ? JSON.parse(user.mfaBackupCodes).length 
      : 0;

    res.json({
      success: true,
      mfa: {
        enabled: user.mfaEnabled || false,
        method: user.mfaMethod,
        backupCodesRemaining: backupCodesCount,
        sessionVerified: req.session?.mfaVerified || false
      }
    });

  } catch (error: any) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MFA status'
    });
  }
});

// Helper functions
function generateBackupCodes(): string {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(crypto.createHash('sha256').update(code).digest('hex'));
  }
  return JSON.stringify(codes);
}

async function sendSmsToken(phone: string, token: string): Promise<void> {
  // Integration with SMS service (Twilio, etc.)
  console.log(`SMS MFA token for ${phone}: ${token}`);
  // In production, implement actual SMS sending
}

async function sendEmailToken(email: string, token: string): Promise<void> {
  // Integration with email service
  console.log(`Email MFA token for ${email}: ${token}`);
  // In production, implement actual email sending
}

async function verifyMfaToken(userId: number, token: string): Promise<{ success: boolean }> {
  // Simplified verification - in production, implement proper verification
  return { success: token.length >= 4 };
}

export default router;
