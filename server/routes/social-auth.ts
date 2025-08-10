
import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { sanitizeInput } from '../middleware/validation';

const router = express.Router();

const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  profile: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatar: z.string().optional()
  }).optional()
});

// Social login endpoint
router.post('/social-login', 
  sanitizeInput(),
  async (req, res) => {
    try {
      const { provider, profile } = socialLoginSchema.parse(req.body);

      // For development, return mock data if no profile provided
      if (!profile) {
        const mockProfiles = {
          google: {
            id: 'google_dev_123',
            email: 'user@gmail.com',
            name: 'Google Dev User',
            avatar: 'https://via.placeholder.com/100'
          },
          apple: {
            id: 'apple_dev_123',
            email: 'user@privaterelay.appleid.com',
            name: 'Apple Dev User'
          },
          facebook: {
            id: 'facebook_dev_123',
            email: 'user@facebook.com',
            name: 'Facebook Dev User',
            avatar: 'https://via.placeholder.com/100'
          }
        };

        return res.json({
          success: true,
          profile: {
            ...mockProfiles[provider],
            provider
          },
          message: 'Development mode - mock authentication'
        });
      }

      // Check if user exists with this social ID
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      let user = existingUser;

      if (!user) {
        // Create new user from social profile
        const [newUser] = await db
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
        
        user = newUser;
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
        email: user.email,
        fullName: user.fullName,
        role: user.role
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
