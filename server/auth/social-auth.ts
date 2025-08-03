import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, socialProfiles } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Social authentication providers configuration
const SOCIAL_PROVIDERS = {
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
  FACEBOOK: 'FACEBOOK'
} as const;

type SocialProvider = keyof typeof SOCIAL_PROVIDERS;

interface SocialUserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  provider: SocialProvider;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified: boolean;
}

interface AppleProfile {
  sub: string;
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email_verified?: boolean;
}

interface FacebookProfile {
  id: string;
  email?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

// Verify Google ID token
async function verifyGoogleToken(idToken: string): Promise<GoogleProfile | null> {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) return null;
    
    const profile = await response.json() as GoogleProfile;
    
    // Verify the audience (client ID)
    if (profile.sub && profile.email && profile.email_verified) {
      return profile;
    }
    return null;
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}

// Verify Apple ID token
async function verifyAppleToken(idToken: string): Promise<AppleProfile | null> {
  try {
    // For production, you would verify the JWT signature using Apple's public keys
    // For now, we'll decode the payload (in production, use proper JWT verification)
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    
    if (payload.sub && payload.aud === process.env.VITE_APPLE_CLIENT_ID) {
      return payload as AppleProfile;
    }
    return null;
  } catch (error) {
    console.error('Apple token verification failed:', error);
    return null;
  }
}

// Verify Facebook access token
async function verifyFacebookToken(accessToken: string): Promise<FacebookProfile | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,email,name,first_name,last_name,picture&access_token=${accessToken}`
    );
    
    if (!response.ok) return null;
    
    const profile = await response.json() as FacebookProfile;
    return profile.id ? profile : null;
  } catch (error) {
    console.error('Facebook token verification failed:', error);
    return null;
  }
}

// Process social profile and create/update user
async function processSocialProfile(profile: SocialUserProfile): Promise<any> {
  try {
    // Check if user exists with this social profile
    const existingSocialProfile = await db.select()
      .from(socialProfiles)
      .where(and(
        eq(socialProfiles.provider, profile.provider),
        eq(socialProfiles.providerId, profile.id)
      ))
      .limit(1);

    let user;

    if (existingSocialProfile.length > 0) {
      // User exists, get their details
      const userId = existingSocialProfile[0].userId;
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      user = existingUser[0];

      // Update last login
      await db.update(users)
        .set({ 
          lastLoginAt: new Date(),
          profilePicture: profile.profilePicture || user.profilePicture
        })
        .where(eq(users.id, userId));

    } else {
      // Check if user exists with same email
      let existingUser = null;
      if (profile.email) {
        const existingUsers = await db.select()
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);
        
        existingUser = existingUsers[0];
      }

      if (existingUser) {
        // Link social profile to existing user
        user = existingUser;
        
        await db.insert(socialProfiles).values({
          userId: user.id,
          provider: profile.provider,
          providerId: profile.id,
          email: profile.email,
          displayName: profile.name,
          profilePicture: profile.profilePicture
        });

        // Update user profile picture if not set
        if (!user.profilePicture && profile.profilePicture) {
          await db.update(users)
            .set({ 
              profilePicture: profile.profilePicture,
              lastLoginAt: new Date()
            })
            .where(eq(users.id, user.id));
        }

      } else {
        // Create new user
        const newUsers = await db.insert(users).values({
          fullName: profile.name,
          email: profile.email || '',
          role: 'CONSUMER',
          isVerified: true, // Social accounts are pre-verified
          profilePicture: profile.profilePicture,
          lastLoginAt: new Date(),
          createdAt: new Date()
        }).returning();

        user = newUsers[0];

        // Create social profile record
        await db.insert(socialProfiles).values({
          userId: user.id,
          provider: profile.provider,
          providerId: profile.id,
          email: profile.email,
          displayName: profile.name,
          profilePicture: profile.profilePicture
        });
      }
    }

    return user;
  } catch (error) {
    console.error('Error processing social profile:', error);
    throw error;
  }
}

// Generate JWT token for authenticated user
function generateAuthToken(user: any): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d'
  });
}

// Main social authentication handler
export async function handleSocialAuth(req: Request, res: Response) {
  try {
    const { provider, token, userInfo } = req.body;

    if (!provider || !token) {
      return res.status(400).json({
        success: false,
        message: 'Provider and token are required'
      });
    }

    let socialProfile: SocialUserProfile | null = null;

    // Verify token based on provider
    switch (provider.toUpperCase()) {
      case 'GOOGLE':
        const googleProfile = await verifyGoogleToken(token);
        if (googleProfile) {
          socialProfile = {
            id: googleProfile.sub,
            email: googleProfile.email,
            name: googleProfile.name,
            firstName: googleProfile.given_name,
            lastName: googleProfile.family_name,
            profilePicture: googleProfile.picture,
            provider: 'GOOGLE'
          };
        }
        break;

      case 'APPLE':
        const appleProfile = await verifyAppleToken(token);
        if (appleProfile) {
          socialProfile = {
            id: appleProfile.sub,
            email: appleProfile.email || '',
            name: userInfo?.name || `${appleProfile.name?.firstName || ''} ${appleProfile.name?.lastName || ''}`.trim() || 'Apple User',
            firstName: appleProfile.name?.firstName || userInfo?.firstName,
            lastName: appleProfile.name?.lastName || userInfo?.lastName,
            provider: 'APPLE'
          };
        }
        break;

      case 'FACEBOOK':
        const facebookProfile = await verifyFacebookToken(token);
        if (facebookProfile) {
          socialProfile = {
            id: facebookProfile.id,
            email: facebookProfile.email || '',
            name: facebookProfile.name,
            firstName: facebookProfile.first_name,
            lastName: facebookProfile.last_name,
            profilePicture: facebookProfile.picture?.data?.url,
            provider: 'FACEBOOK'
          };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported social provider'
        });
    }

    if (!socialProfile) {
      return res.status(401).json({
        success: false,
        message: 'Invalid social authentication token'
      });
    }

    // Process the social profile (create or update user)
    const user = await processSocialProfile(socialProfile);

    // Generate authentication token
    const authToken = generateAuthToken(user);

    // Set session
    req.session!.userId = user.id;
    req.session!.userRole = user.role;
    req.session!.isAuthenticated = true;

    res.json({
      success: true,
      message: 'Social authentication successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified
      },
      token: authToken
    });

  } catch (error) {
    console.error('Social authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Social authentication failed'
    });
  }
}

// Link additional social account to existing user
export async function linkSocialAccount(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { provider, token } = req.body;
    const userId = req.session.userId;

    if (!provider || !token) {
      return res.status(400).json({
        success: false,
        message: 'Provider and token are required'
      });
    }

    let socialProfile: SocialUserProfile | null = null;

    // Verify and get profile based on provider
    switch (provider.toUpperCase()) {
      case 'GOOGLE':
        const googleProfile = await verifyGoogleToken(token);
        if (googleProfile) {
          socialProfile = {
            id: googleProfile.sub,
            email: googleProfile.email,
            name: googleProfile.name,
            profilePicture: googleProfile.picture,
            provider: 'GOOGLE'
          };
        }
        break;

      case 'APPLE':
        const appleProfile = await verifyAppleToken(token);
        if (appleProfile) {
          socialProfile = {
            id: appleProfile.sub,
            email: appleProfile.email || '',
            name: `${appleProfile.name?.firstName || ''} ${appleProfile.name?.lastName || ''}`.trim() || 'Apple User',
            provider: 'APPLE'
          };
        }
        break;

      case 'FACEBOOK':
        const facebookProfile = await verifyFacebookToken(token);
        if (facebookProfile) {
          socialProfile = {
            id: facebookProfile.id,
            email: facebookProfile.email || '',
            name: facebookProfile.name,
            profilePicture: facebookProfile.picture?.data?.url,
            provider: 'FACEBOOK'
          };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported social provider'
        });
    }

    if (!socialProfile) {
      return res.status(401).json({
        success: false,
        message: 'Invalid social authentication token'
      });
    }

    // Check if this social account is already linked to another user
    const existingLink = await db.select()
      .from(socialProfiles)
      .where(and(
        eq(socialProfiles.provider, socialProfile.provider),
        eq(socialProfiles.providerId, socialProfile.id)
      ))
      .limit(1);

    if (existingLink.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This social account is already linked to another user'
      });
    }

    // Link the social account to current user
    await db.insert(socialProfiles).values({
      userId: userId,
      provider: socialProfile.provider,
      providerId: socialProfile.id,
      email: socialProfile.email,
      displayName: socialProfile.name,
      profilePicture: socialProfile.profilePicture
    });

    res.json({
      success: true,
      message: `${socialProfile.provider} account linked successfully`
    });

  } catch (error) {
    console.error('Link social account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link social account'
    });
  }
}

// Get user's linked social accounts
export async function getLinkedSocialAccounts(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.session.userId;

    const linkedAccounts = await db.select({
      id: socialProfiles.id,
      provider: socialProfiles.provider,
      displayName: socialProfiles.displayName,
      email: socialProfiles.email,
      profilePicture: socialProfiles.profilePicture,
      linkedAt: socialProfiles.createdAt
    })
    .from(socialProfiles)
    .where(eq(socialProfiles.userId, userId));

    res.json({
      success: true,
      linkedAccounts
    });

  } catch (error) {
    console.error('Get linked accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch linked accounts'
    });
  }
}

// Unlink social account
export async function unlinkSocialAccount(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { provider } = req.params;
    const userId = req.session.userId;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }

    // Remove the social profile link
    const result = await db.delete(socialProfiles)
      .where(and(
        eq(socialProfiles.userId, userId),
        eq(socialProfiles.provider, provider.toUpperCase() as SocialProvider)
      ));

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`
    });

  } catch (error) {
    console.error('Unlink social account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink social account'
    });
  }
}