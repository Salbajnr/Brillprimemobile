
import express from 'express';
import { db } from '../db';
import { transactions, fuelOrders, users, driverProfiles } from '../../shared/schema';
import { eq, sql, desc, gte, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get driver earnings summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    // Get total earnings
    const [totalEarnings] = await db
      .select({ total: sql`sum(cast(amount as decimal))` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.transactionType, 'EARNING')
      ));

    // Get this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyEarnings] = await db
      .select({ total: sql`sum(cast(amount as decimal))` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.transactionType, 'EARNING'),
        gte(transactions.createdAt, startOfMonth)
      ));

    // Get completed deliveries count
    const [completedDeliveries] = await db
      .select({ count: sql`count(*)` })
      .from(fuelOrders)
      .where(and(
        eq(fuelOrders.driverId, userId),
        eq(fuelOrders.status, 'DELIVERED')
      ));

    // Get average rating
    const driverProfile = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    res.json({
      success: true,
      data: {
        totalEarnings: Number(totalEarnings?.total || 0),
        monthlyEarnings: Number(monthlyEarnings?.total || 0),
        completedDeliveries: Number(completedDeliveries?.count || 0),
        averageRating: driverProfile[0]?.rating || 0,
        totalRides: driverProfile[0]?.totalDeliveries || 0
      }
    });
  } catch (error) {
    console.error('Driver earnings summary error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings summary' });
  }
});

// Get detailed earnings history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const earnings = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        transactionType: transactions.transactionType,
        description: transactions.description,
        createdAt: transactions.createdAt,
        orderId: transactions.orderId
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.transactionType, 'EARNING')
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: earnings.map(earning => ({
        id: earning.id,
        amount: Number(earning.amount),
        type: earning.transactionType,
        description: earning.description,
        date: earning.createdAt,
        orderId: earning.orderId
      }))
    });
  } catch (error) {
    console.error('Driver earnings history error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
});

// Weekly earnings breakdown
router.get('/weekly', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const weeklyEarnings = await db
      .select({
        date: sql`DATE(created_at)`,
        earnings: sql`sum(cast(amount as decimal))`,
        deliveries: sql`count(*)`
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.transactionType, 'EARNING'),
        gte(transactions.createdAt, startOfWeek)
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    res.json({
      success: true,
      data: weeklyEarnings.map(day => ({
        date: day.date,
        earnings: Number(day.earnings || 0),
        deliveries: Number(day.deliveries)
      }))
    });
  } catch (error) {
    console.error('Driver weekly earnings error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly earnings' });
  }
});

export default router;
