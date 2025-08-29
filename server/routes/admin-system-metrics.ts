
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users, orders, transactions } from '../../shared/schema';
import { eq, count, gte, sql } from 'drizzle-orm';

const router = express.Router();

// System metrics endpoint
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get system uptime (mock data for now)
    const uptime = process.uptime();

    // Get system resource usage (mock data)
    const systemMetrics = {
      server: {
        uptime: uptime,
        cpu: Math.random() * 30 + 10, // Mock CPU usage 10-40%
        memory: Math.random() * 20 + 30, // Mock memory usage 30-50%
        disk: Math.random() * 10 + 20, // Mock disk usage 20-30%
      },
      database: {
        connections: 10, // Mock active connections
        queryTime: Math.random() * 50 + 10, // Mock query time 10-60ms
        size: 150.5, // Mock DB size in MB
        status: 'healthy' as const,
      },
      performance: {
        responseTime: Math.random() * 100 + 50, // Mock response time 50-150ms
        throughput: Math.floor(Math.random() * 100 + 200), // Mock throughput 200-300 req/min
        errorRate: Math.random() * 2, // Mock error rate 0-2%
      },
      realTime: {
        activeUsers: await getActiveUsers(),
        activeConnections: global.io ? global.io.engine.clientsCount : 0,
        messagesSent: Math.floor(Math.random() * 1000 + 500), // Mock messages
      },
    };

    res.json(systemMetrics);
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// Get database performance metrics
router.get('/database/performance', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Mock database performance data
    const dbMetrics = {
      queryStats: {
        averageTime: Math.random() * 50 + 10,
        slowQueries: Math.floor(Math.random() * 5),
        totalQueries: Math.floor(Math.random() * 10000 + 5000),
      },
      connections: {
        active: Math.floor(Math.random() * 50 + 10),
        idle: Math.floor(Math.random() * 20 + 5),
        total: Math.floor(Math.random() * 100 + 50),
      },
      storage: {
        size: Math.random() * 1000 + 500, // MB
        growth: Math.random() * 10 + 2, // MB/day
        available: Math.random() * 5000 + 2000, // MB
      },
    };

    res.json(dbMetrics);
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch database metrics' });
  }
});

// Get real-time system alerts
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Mock system alerts
    const alerts = [
      {
        id: '1',
        type: 'warning',
        title: 'High CPU Usage',
        message: 'CPU usage is above 80% for the last 5 minutes',
        timestamp: new Date().toISOString(),
        resolved: false,
      },
      {
        id: '2',
        type: 'info',
        title: 'Database Optimization',
        message: 'Scheduled database maintenance completed successfully',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        resolved: true,
      },
    ];

    res.json({ alerts });
  } catch (error) {
    console.error('System alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch system alerts' });
  }
});

// Helper function to get active users
async function getActiveUsers(): Promise<number> {
  try {
    // Get users who have been active in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLoginAt, oneHourAgo));

    return result.count;
  } catch (error) {
    console.error('Error getting active users:', error);
    return 0;
  }
}

export default router;
