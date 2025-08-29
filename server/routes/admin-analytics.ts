
import express from 'express';
import { db } from '../db';
import { orders, users, transactions, fuelOrders } from '../../shared/schema';
import { eq, sql, desc, gte, lte, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Admin analytics overview
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [totalUsers] = await db
      .select({ count: sql`count(*)` })
      .from(users);

    const [totalOrders] = await db
      .select({ count: sql`count(*)` })
      .from(orders);

    const [totalTransactions] = await db
      .select({ 
        count: sql`count(*)`,
        totalAmount: sql`sum(cast(amount as decimal))` 
      })
      .from(transactions);

    const [activeDrivers] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'DRIVER'), eq(users.isActive, true)));

    res.json({
      success: true,
      data: {
        totalUsers: Number(totalUsers.count),
        totalOrders: Number(totalOrders.count),
        totalTransactions: Number(totalTransactions.count),
        totalRevenue: Number(totalTransactions.totalAmount || 0),
        activeDrivers: Number(activeDrivers.count),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Revenue analytics
router.get('/revenue', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '30d' } = req.query;
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const revenueData = await db
      .select({
        date: sql`DATE(created_at)`,
        revenue: sql`sum(cast(amount as decimal))`,
        transactionCount: sql`count(*)`
      })
      .from(transactions)
      .where(gte(transactions.createdAt, startDate))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    res.json({
      success: true,
      data: revenueData.map(item => ({
        date: item.date,
        revenue: Number(item.revenue || 0),
        transactionCount: Number(item.transactionCount)
      }))
    });
  } catch (error) {
    console.error('Admin revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// User growth analytics
router.get('/user-growth', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '30d' } = req.query;
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const userGrowth = await db
      .select({
        date: sql`DATE(created_at)`,
        newUsers: sql`count(*)`,
        role: users.role
      })
      .from(users)
      .where(gte(users.createdAt, startDate))
      .groupBy(sql`DATE(created_at), role`)
      .orderBy(sql`DATE(created_at)`);

    res.json({
      success: true,
      data: userGrowth
    });
  } catch (error) {
    console.error('Admin user growth analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user growth analytics' });
  }
});

// Order analytics
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '30d' } = req.query;
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const orderStats = await db
      .select({
        status: orders.status,
        count: sql`count(*)`,
        totalAmount: sql`sum(cast(total_amount as decimal))`
      })
      .from(orders)
      .where(gte(orders.createdAt, startDate))
      .groupBy(orders.status);

    res.json({
      success: true,
      data: orderStats.map(stat => ({
        status: stat.status,
        count: Number(stat.count),
        totalAmount: Number(stat.totalAmount || 0)
      }))
    });
  } catch (error) {
    console.error('Admin order analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch order analytics' });
  }
});

export default router;
