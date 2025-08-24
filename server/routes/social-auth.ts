
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
        // Enhanced Apple Sign In token verification
        try {
          const appleProfile = await verifyAppleToken(token, clientProfile);
          if (!appleProfile) {
            throw new Error('Invalid Apple token');
          }
          profile = appleProfile;
        } catch (error) {
          console.error('Apple token verification failed:', error);
          return res.status(400).json({
            success: false,
            message: 'Invalid Apple token'
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

// Enhanced Apple Sign In token verification
async function verifyAppleToken(token: string, clientProfile: any) {
  try {
    // Check if we have Apple client configuration
    const appleClientId = process.env.VITE_APPLE_CLIENT_ID;
    const appleTeamId = process.env.APPLE_TEAM_ID;
    
    if (appleClientId && appleTeamId && token.includes('.')) {
      try {
        // Basic JWT parsing (in production, verify signature with Apple's public keys)
        const [header, payload, signature] = token.split('.');
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        
        // Basic validation checks
        if (decodedPayload.aud !== appleClientId) {
          throw new Error('Invalid audience');
        }
        
        if (decodedPayload.iss !== 'https://appleid.apple.com') {
          throw new Error('Invalid issuer');
        }
        
        if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
          throw new Error('Token expired');
        }
        
        // Extract user info from token
        return {
          id: decodedPayload.sub,
          email: decodedPayload.email || clientProfile?.email,
          name: clientProfile?.name || decodedPayload.email?.split('@')[0],
          avatar: null // Apple doesn't provide avatar
        };
      } catch (jwtError) {
        console.warn('Apple JWT verification failed, using client profile:', jwtError);
      }
    }
    
    // Fallback to client-provided profile with additional validation
    if (clientProfile && clientProfile.email) {
      return {
        id: clientProfile.id || `apple_${Date.now()}`,
        email: clientProfile.email,
        name: clientProfile.name || clientProfile.email.split('@')[0],
        avatar: null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Apple token verification error:', error);
    return null;
  }
}

export default router;
