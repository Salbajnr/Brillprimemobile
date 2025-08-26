import express from 'express';
import { db } from '../db';
import { driverProfiles, users, orders } from '../../shared/schema';
import { eq, desc, and, count, sql, sum, gte } from 'drizzle-orm';

const router = express.Router();

// Driver tier definitions
const DRIVER_TIERS = {
  NOVICE: {
    name: 'Novice',
    minDeliveries: 0,
    minRating: 0,
    minEarnings: 0,
    benefits: ['Basic support', 'Standard commission rate'],
    nextTier: 'EXPERIENCED'
  },
  EXPERIENCED: {
    name: 'Experienced',
    minDeliveries: 50,
    minRating: 4.0,
    minEarnings: 100000, // NGN 100,000
    benefits: ['Priority order assignment', '5% commission bonus', 'Enhanced support'],
    nextTier: 'PROFESSIONAL'
  },
  PROFESSIONAL: {
    name: 'Professional',
    minDeliveries: 200,
    minRating: 4.3,
    minEarnings: 500000, // NGN 500,000
    benefits: ['Premium order preferences', '10% commission bonus', 'Monthly rewards'],
    nextTier: 'ELITE'
  },
  ELITE: {
    name: 'Elite',
    minDeliveries: 500,
    minRating: 4.5,
    minEarnings: 1500000, // NGN 1,500,000
    benefits: ['Exclusive high-value orders', '15% commission bonus', 'Personal account manager'],
    nextTier: null
  }
} as const;

// GET /api/driver-tier/status - Get driver tier status and progress
router.get('/status', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(401).json({
        success: false,
        message: 'Driver authentication required'
      });
    }

    // Get driver profile
    const [driverProfile] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get driver statistics
    const [deliveryStats] = await db
      .select({ 
        totalDeliveries: count(),
        totalEarnings: sum(orders.totalAmount)
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, userId),
        eq(orders.status, 'DELIVERED')
      ));

    const totalDeliveries = deliveryStats?.totalDeliveries || 0;
    const totalEarnings = parseFloat(deliveryStats?.totalEarnings || '0');
    const currentRating = parseFloat(driverProfile.rating || '0');

    // Calculate current tier and progress
    const tierCalculation = calculateDriverTier(totalDeliveries, currentRating, totalEarnings);

    res.json({
      success: true,
      tierStatus: {
        currentTier: tierCalculation.currentTier,
        tierInfo: DRIVER_TIERS[tierCalculation.currentTier as keyof typeof DRIVER_TIERS],
        progress: tierCalculation.progress,
        nextTier: tierCalculation.nextTier,
        nextTierRequirements: tierCalculation.nextTierRequirements,
        stats: {
          totalDeliveries,
          totalEarnings,
          currentRating,
          requirementsNeeded: tierCalculation.requirementsNeeded
        }
      }
    });

  } catch (error: any) {
    console.error('Driver tier status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver tier status'
    });
  }
});

// GET /api/driver-tier/all - Get all tier information
router.get('/all', async (req, res) => {
  try {
    res.json({
      success: true,
      tiers: DRIVER_TIERS
    });
  } catch (error: any) {
    console.error('Get all tiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tier information'
    });
  }
});

// Helper function to calculate driver tier and progress
function calculateDriverTier(totalDeliveries: number, rating: number, totalEarnings: number) {
  let currentTier = 'NOVICE';
  let progress = 0;
  let nextTier = null;
  let nextTierRequirements = null;
  let requirementsNeeded: string[] = [];

  // Determine current tier
  const tierKeys = Object.keys(DRIVER_TIERS) as Array<keyof typeof DRIVER_TIERS>;
  for (const tierKey of tierKeys.reverse()) { // Start from highest tier
    const tier = DRIVER_TIERS[tierKey];
    if (totalDeliveries >= tier.minDeliveries && 
        rating >= tier.minRating && 
        totalEarnings >= tier.minEarnings) {
      currentTier = tierKey;
      break;
    }
  }

  // Calculate progress to next tier
  const current = DRIVER_TIERS[currentTier as keyof typeof DRIVER_TIERS];
  if (current.nextTier) {
    nextTier = current.nextTier;
    const next = DRIVER_TIERS[current.nextTier as keyof typeof DRIVER_TIERS];
    nextTierRequirements = {
      minDeliveries: next.minDeliveries,
      minRating: next.minRating,
      minEarnings: next.minEarnings
    };

    // Calculate progress factors
    const deliveryProgress = Math.min(totalDeliveries / next.minDeliveries, 1);
    const ratingProgress = Math.min(rating / next.minRating, 1);
    const earningsProgress = Math.min(totalEarnings / next.minEarnings, 1);

    // Overall progress is the minimum of all factors (all requirements must be met)
    progress = Math.min(deliveryProgress, ratingProgress, earningsProgress) * 100;

    // Track what's still needed
    if (totalDeliveries < next.minDeliveries) {
      requirementsNeeded.push(`${next.minDeliveries - totalDeliveries} more deliveries`);
    }
    if (rating < next.minRating) {
      requirementsNeeded.push(`${(next.minRating - rating).toFixed(1)} rating points`);
    }
    if (totalEarnings < next.minEarnings) {
      const needed = next.minEarnings - totalEarnings;
      requirementsNeeded.push(`₦${needed.toLocaleString()} more earnings`);
    }
  }

  return {
    currentTier,
    progress: Math.round(progress),
    nextTier,
    nextTierRequirements,
    requirementsNeeded
  };
}

export default router;