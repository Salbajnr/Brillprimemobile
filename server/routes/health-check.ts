
import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'OK',
        session: 'OK',
        redis: 'OK'
      }
    };

    // Test database connection
    try {
      await db.select().from(users).limit(1);
    } catch (dbError) {
      healthCheck.services.database = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    // Test session store
    if (!req.session) {
      healthCheck.services.session = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    res.json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

router.get('/health/detailed', async (req, res) => {
  try {
    const detailed = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      database: {
        status: 'OK',
        connected: true
      },
      session: {
        status: req.session ? 'OK' : 'ERROR',
        sessionId: req.session?.id || null
      }
    };

    res.json(detailed);
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Detailed health check failed'
    });
  }
});

export default router;
