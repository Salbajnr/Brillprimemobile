
import express from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { sanitizeInput } from '../middleware/validation';

// Extend the session interface
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

const router = express.Router();

const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  token: z.string().optional(), // OAuth token for verification
  profile: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatar: z.string().optional()
  }).optional()
});

// Initialize Google OAuth client
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// Social login endpoint
router.post('/social-login', 
  sanitizeInput(),
  async (req, res) => {
    try {
      const { provider, token, profile: clientProfile } = socialLoginSchema.parse(req.body);
      let profile = clientProfile;

      // Verify token and get real profile data
      if (provider === 'google' && token) {
        if (!googleClient) {
          return res.status(500).json({
            success: false,
            message: 'Google OAuth not configured - missing GOOGLE_CLIENT_ID'
          });
        }

        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          
          const payload = ticket.getPayload();
          if (payload) {
            profile = {
              id: payload.sub,
              email: payload.email!,
              name: payload.name!,
              avatar: payload.picture
            };
          }
        } catch (error) {
          console.error('Google token verification failed:', error);
          return res.status(400).json({
            success: false,
            message: 'Invalid Google token'
          });
        }
      } else if (provider === 'facebook' && token) {
        // Facebook token verification
        try {
          const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`);
          const fbData = await fbResponse.json();
          
          if (fbData.error) {
            throw new Error(fbData.error.message);
          }
          
          profile = {
            id: fbData.id,
            email: fbData.email,
            name: fbData.name,
            avatar: fbData.picture?.data?.url
          };
        } catch (error) {
          console.error('Facebook token verification failed:', error);
          return res.status(400).json({
            success: false,
            message: 'Invalid Facebook token'
          });
        }
      } else if (provider === 'apple' && token) {
        // Apple Sign In token verification would require JWT verification
        // For now, we'll trust the client-provided profile for Apple
        if (!clientProfile) {
          return res.status(400).json({
            success: false,
            message: 'Apple Sign In profile data required'
          });
        }
      }

      // If no profile data available, return error
      if (!profile) {
        return res.status(400).json({
          success: false,
          message: `${provider} authentication failed - no profile data available`
        });
      }

      // Check if user exists with this social ID
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);
      
      const existingUser = existingUsers[0];

      let user = existingUser;

      if (!user) {
        // Create new user from social profile
        const newUsers = await db
          .insert(users)
          .values({
            email: profile.email,
            fullName: profile.name,
            passwordHash: '', // No password for social users
            role: 'CONSUMER',
            isVerified: true, // Social accounts are pre-verified
            socialProvider: provider,
            socialId: profile.id,
            avatar: profile.avatar,
            createdAt: new Date()
          })
          .returning();
        
        user = newUsers[0];
      } else if (!user.socialProvider) {
        // Link social account to existing user
        await db
          .update(users)
          .set({
            socialProvider: provider,
            socialId: profile.id,
            avatar: profile.avatar || user.avatar
          })
          .where(eq(users.id, user.id));
      }

      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        userId: user.userId || `user_${user.id}`,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified || false,
        profilePicture: user.avatar
      };

      res.json({
        success: true,
        profile: {
          ...profile,
          provider
        },
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar
        }
      });

    } catch (error) {
      console.error('Social auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Social authentication failed'
      });
    }
  }
);

export default router;
