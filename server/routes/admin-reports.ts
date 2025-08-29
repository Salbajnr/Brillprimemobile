
import express from 'express';
import { db } from '../db';
import { users, orders, transactions, fuelOrders, supportTickets } from '../../shared/schema';
import { eq, desc, count, sum, gte, lte, and } from 'drizzle-orm';
import { adminAuth, requirePermission } from '../middleware/adminAuth';

const router = express.Router();

// Financial Reports
router.get('/reports/financial', adminAuth, requirePermission('VIEW_REPORTS'), async (req, res) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Revenue analysis
    const [revenueData] = await db
      .select({
        totalRevenue: sum(transactions.amount),
        totalTransactions: count(transactions.id),
        avgTransactionValue: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'SUCCESS'),
        gte(transactions.initiatedAt, start),
        lte(transactions.initiatedAt, end)
      ));

    // Order analysis
    const [orderData] = await db
      .select({
        totalOrders: count(orders.id),
        completedOrders: count(orders.id),
        totalOrderValue: sum(orders.totalPrice)
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ));

    // Platform fees
    const [feeData] = await db
      .select({
        totalFees: sum(transactions.fee),
        platformRevenue: sum(transactions.fee)
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'SUCCESS'),
        gte(transactions.initiatedAt, start),
        lte(transactions.initiatedAt, end)
      ));

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          total: revenueData.totalRevenue || 0,
          transactions: revenueData.totalTransactions || 0,
          average: revenueData.avgTransactionValue || 0
        },
        orders: {
          total: orderData.totalOrders || 0,
          completed: orderData.completedOrders || 0,
          value: orderData.totalOrderValue || 0
        },
        fees: {
          total: feeData.totalFees || 0,
          platformRevenue: feeData.platformRevenue || 0
        }
      }
    });
  } catch (error) {
    console.error('Financial reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate financial reports' });
  }
});

// User Growth Reports
router.get('/reports/user-growth', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily user registrations
    const userGrowth = await db
      .select({
        date: users.createdAt,
        role: users.role,
        count: count()
      })
      .from(users)
      .where(gte(users.createdAt, startDate))
      .groupBy(users.createdAt, users.role)
      .orderBy(desc(users.createdAt));

    // User activity stats
    const [activityStats] = await db
      .select({
        totalUsers: count(),
        activeUsers: count(),
        verifiedUsers: count()
      })
      .from(users);

    res.json({
      success: true,
      data: {
        growth: userGrowth,
        stats: activityStats,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('User growth reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate user growth reports' });
  }
});

// Platform Performance Reports
router.get('/reports/performance', adminAuth, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    const hours = timeframe === '1h' ? 1 : timeframe === '7d' ? 168 : 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // API performance metrics
    const performanceData = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: global.io ? global.io.sockets.sockets.size : 0,
      
      // Mock data for demonstration
      responseTime: {
        average: 250,
        p95: 500,
        p99: 1000
      },
      errorRate: 0.02,
      requestsPerSecond: 45.7
    };

    res.json({
      success: true,
      data: performanceData,
      timestamp: new Date(),
      timeframe
    });
  } catch (error) {
    console.error('Performance reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate performance reports' });
  }
});

// Export reports as CSV/PDF
router.get('/reports/export/:reportType', adminAuth, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'csv', startDate, endDate } = req.query;

    // Mock export functionality
    const exportData = {
      reportType,
      format,
      dateRange: { startDate, endDate },
      downloadUrl: `/api/admin/downloads/report_${reportType}_${Date.now()}.${format}`,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: exportData,
      message: 'Report export initiated'
    });
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to export report' });
  }
});

export default router;
