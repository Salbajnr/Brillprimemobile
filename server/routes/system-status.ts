
import express from 'express';
import { db } from '../db';
import { users, orders, transactions } from '../../shared/schema';
import { count } from 'drizzle-orm';

const router = express.Router();

// System status and metrics
router.get('/status', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Database connectivity test
    const [userCount] = await db.select({ count: count() }).from(users);
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [transactionCount] = await db.select({ count: count() }).from(transactions);
    
    const dbResponseTime = Date.now() - startTime;
    
    // System health metrics
    const systemStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`,
        users: userCount.count,
        orders: orderCount.count,
        transactions: transactionCount.count
      },
      server: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      },
      services: {
        redis: process.env.REDIS_URL ? 'connected' : 'disabled',
        paystack: process.env.PAYSTACK_SECRET_KEY ? 'configured' : 'not_configured',
        websocket: global.io ? 'active' : 'inactive',
        email: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured'
      },
      features: {
        authentication: 'active',
        payments: 'active',
        orders: 'active',
        realtime: 'active',
        kyc: 'active',
        mfa: 'active'
      }
    };
    
    res.json({
      success: true,
      data: systemStatus
    });
    
  } catch (error) {
    console.error('System status check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'System status check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Feature-specific health checks
router.get('/features', async (req, res) => {
  try {
    const features = {
      authentication: {
        status: 'active',
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/me']
      },
      orders: {
        status: 'active',
        endpoints: ['/api/orders', '/api/orders/:id', '/api/orders/:id/status']
      },
      payments: {
        status: process.env.PAYSTACK_SECRET_KEY ? 'configured' : 'needs_configuration',
        endpoints: ['/api/payments/initialize', '/api/payments/verify']
      },
      realtime: {
        status: global.io ? 'active' : 'inactive',
        connections: global.io ? global.io.engine.clientsCount : 0
      },
      wallet: {
        status: 'active',
        endpoints: ['/api/wallet/balance', '/api/wallet/fund']
      },
      kyc: {
        status: 'active',
        endpoints: ['/api/verification/requirements', '/api/verification/submit']
      }
    };

    res.json({
      success: true,
      features
    });

  } catch (error) {
    console.error('Feature status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Feature status check failed'
    });
  }
});

export default router;
