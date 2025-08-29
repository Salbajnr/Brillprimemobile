
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { orders, users, driverProfiles, ratings } from '../../shared/schema';
import { eq, count, sum, avg, gte, and, desc } from 'drizzle-orm';

const router = express.Router();

// Get driver performance metrics
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const timeRange = req.query.range as string || '7d';
    const startDate = getStartDate(timeRange);

    // Get earnings data
    const earningsData = await db
      .select({
        totalAmount: sum(orders.driverEarnings),
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, userId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, startDate)
      ));

    // Get all-time earnings
    const allTimeEarnings = await db
      .select({
        totalAmount: sum(orders.driverEarnings),
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, userId),
        eq(orders.status, 'DELIVERED')
      ));

    // Get delivery statistics
    const deliveryStats = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, userId),
        gte(orders.createdAt, startDate)
      ))
      .groupBy(orders.status);

    // Get ratings data
    const ratingsData = await db
      .select({
        rating: ratings.rating,
        count: count()
      })
      .from(ratings)
      .where(eq(ratings.driverId, userId))
      .groupBy(ratings.rating);

    // Calculate averages
    const avgRating = await db
      .select({ average: avg(ratings.rating) })
      .from(ratings)
      .where(eq(ratings.driverId, userId));

    // Mock achievements data
    const achievements = [
      {
        id: '1',
        title: 'First Delivery',
        description: 'Completed your first successful delivery',
        dateEarned: '2024-01-15',
        type: 'deliveries',
      },
      {
        id: '2',
        title: '5-Star Rating',
        description: 'Received your first 5-star rating',
        dateEarned: '2024-01-20',
        type: 'rating',
      },
    ];

    const completed = deliveryStats.find(s => s.status === 'DELIVERED')?.count || 0;
    const cancelled = deliveryStats.find(s => s.status === 'CANCELLED')?.count || 0;
    const total = completed + cancelled;

    const performance = {
      earnings: {
        today: Math.floor((earningsData[0]?.totalAmount || 0) * 0.1), // Mock today's earnings
        thisWeek: earningsData[0]?.totalAmount || 0,
        thisMonth: Math.floor((earningsData[0]?.totalAmount || 0) * 1.5), // Mock monthly
        total: allTimeEarnings[0]?.totalAmount || 0,
      },
      deliveries: {
        completed,
        cancelled,
        total,
        onTime: Math.floor(completed * 0.9), // Mock 90% on-time rate
      },
      ratings: {
        average: Number(avgRating[0]?.average || 0),
        total: ratingsData.reduce((sum, r) => sum + r.count, 0),
        breakdown: ratingsData.reduce((acc, r) => {
          acc[r.rating] = r.count;
          return acc;
        }, {} as Record<number, number>),
      },
      efficiency: {
        avgDeliveryTime: 25, // Mock average delivery time in minutes
        fuelEfficiency: 15.5, // Mock fuel efficiency
        distance: 250, // Mock total distance
      },
      achievements,
    };

    res.json(performance);
  } catch (error) {
    console.error('Driver performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Get detailed earnings breakdown
router.get('/earnings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const timeRange = req.query.period as string || '30d';
    const startDate = getStartDate(timeRange);

    const earnings = await db
      .select({
        orderId: orders.id,
        amount: orders.driverEarnings,
        date: orders.deliveredAt,
        customerName: users.fullName,
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(and(
        eq(orders.driverId, userId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, startDate)
      ))
      .orderBy(desc(orders.deliveredAt));

    res.json({ earnings });
  } catch (error) {
    console.error('Driver earnings error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings data' });
  }
});

// Helper function to get start date based on time range
function getStartDate(timeRange: string): Date {
  const now = new Date();
  
  switch (timeRange) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

export default router;
