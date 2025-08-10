
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { users, transactions, orders } from '../../shared/schema';
import { eq, and, gte, count } from 'drizzle-orm';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user profile
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userProfile = user[0];

    // Get dashboard data based on role
    let dashboardData: any = {
      user: userProfile,
      stats: {}
    };

    // Common stats for all roles
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (userRole === 'CONSUMER') {
      // Consumer dashboard data
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
      const recentOrders = await db.select().from(orders)
        .where(and(eq(orders.userId, userId), gte(orders.createdAt, today)))
        .limit(5);

      dashboardData.stats = {
        totalOrders: userOrders.length,
        recentOrdersCount: recentOrders.length,
        pendingOrders: userOrders.filter(o => o.status === 'PENDING').length,
        completedOrders: userOrders.filter(o => o.status === 'COMPLETED').length
      };
      dashboardData.recentOrders = recentOrders;

    } else if (userRole === 'MERCHANT') {
      // Merchant dashboard data
      const merchantOrders = await db.select().from(orders).where(eq(orders.merchantId, userId));
      const todayOrders = await db.select().from(orders)
        .where(and(eq(orders.merchantId, userId), gte(orders.createdAt, today)));

      dashboardData.stats = {
        totalOrders: merchantOrders.length,
        todayOrders: todayOrders.length,
        pendingOrders: merchantOrders.filter(o => o.status === 'PENDING').length,
        revenue: merchantOrders.reduce((sum, order) => sum + (order.amount || 0), 0)
      };
      dashboardData.recentOrders = merchantOrders.slice(-5);

    } else if (userRole === 'DRIVER') {
      // Driver dashboard data
      const driverDeliveries = await db.select().from(orders).where(eq(orders.driverId, userId));
      const todayDeliveries = await db.select().from(orders)
        .where(and(eq(orders.driverId, userId), gte(orders.createdAt, today)));

      dashboardData.stats = {
        totalDeliveries: driverDeliveries.length,
        todayDeliveries: todayDeliveries.length,
        completedDeliveries: driverDeliveries.filter(o => o.status === 'COMPLETED').length,
        earnings: driverDeliveries.reduce((sum, order) => sum + (order.deliveryFee || 0), 0)
      };
      dashboardData.recentDeliveries = driverDeliveries.slice(-5);

    } else if (userRole === 'ADMIN') {
      // Admin dashboard data
      const totalUsers = await db.select({ count: count() }).from(users);
      const totalTransactions = await db.select({ count: count() }).from(transactions);
      const totalOrders = await db.select({ count: count() }).from(orders);

      dashboardData.stats = {
        totalUsers: totalUsers[0]?.count || 0,
        totalTransactions: totalTransactions[0]?.count || 0,
        totalOrders: totalOrders[0]?.count || 0,
        platformRevenue: 0 // Calculate based on your commission structure
      };
    }

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
