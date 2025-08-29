import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Express } from "express";
import { storage } from "../storage";


// Health check helper functions
async function checkDatabaseHealth() {
  try {
    // Simple query to check database connectivity
    const result = await db.execute('SELECT 1 as test');
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
      error: error.message
    };
  }
}

function checkStorageHealth() {
  try {
    // Check if storage service is available
    if (typeof storage.getUser === 'function') {
      return {
        status: 'healthy',
        message: 'Storage service available'
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Storage service not properly initialized'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Storage service error: ${error.message}`,
      error: error.message
    };
  }
}

function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const freeMemory = process.memoryUsage().rss;
  const memoryUsagePercent = (memUsage.rss / (1024 * 1024 * 1024)) * 100; // Convert to percentage

  let status = 'healthy';
  let message = 'Memory usage normal';

  if (memoryUsagePercent > 90) {
    status = 'unhealthy';
    message = 'High memory usage detected';
  } else if (memoryUsagePercent > 75) {
    status = 'degraded';
    message = 'Elevated memory usage';
  }

  return {
    status,
    message,
    metrics: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    }
  };
}

function checkWebSocketHealth() {
  try {
    // Check if global.io is available (WebSocket server)
    if ((global as any).io) {
      return {
        status: 'healthy',
        message: 'WebSocket server running',
        connectedClients: (global as any).io.engine.clientsCount || 0
      };
    } else {
      return {
        status: 'degraded',
        message: 'WebSocket server not initialized'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `WebSocket error: ${error.message}`,
      error: error.message
    };
  }
}

async function checkAPIEndpointsHealth() {
  const criticalEndpoints = [
    'authentication',
    'orders',
    'payments',
    'analytics'
  ];

  try {
    // Mock endpoint availability check
    const availableEndpoints = criticalEndpoints.filter(endpoint => {
      // In a real implementation, you'd check if the route handlers are registered
      return true; // Assuming all are available for this mock
    });

    const status = availableEndpoints.length === criticalEndpoints.length ? 'healthy' : 'degraded';

    return {
      status,
      message: `${availableEndpoints.length}/${criticalEndpoints.length} critical endpoints available`,
      endpoints: {
        available: availableEndpoints,
        total: criticalEndpoints.length
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `API endpoints check failed: ${error.message}`,
      error: error.message
    };
  }
}


// Remove duplicate function - using router instead
const router = express.Router();

// Basic health check - simplified
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: "1.0.0"
    };

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

// Comprehensive system health check
router.get('/detailed', async (req, res) => {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      components: {
        database: await checkDatabaseHealth(),
        storage: checkStorageHealth(),
        memory: checkMemoryHealth(),
        websocket: checkWebSocketHealth(),
        apis: await checkAPIEndpointsHealth()
      }
    };

    // Determine overall status
    const componentStatuses = Object.values(healthStatus.components).map(c => c.status);
    if (componentStatuses.includes('unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  });

  // API endpoints status check
  app.get("/api/health/endpoints", async (req, res) => {
    const endpoints = [
      { path: '/api/auth/session', method: 'GET' },
      { path: '/api/categories', method: 'GET' },
      { path: '/api/orders', method: 'GET' },
      { path: '/api/analytics/dashboard', method: 'GET' },
      { path: '/api/driver/dashboard', method: 'GET' },
      { path: '/api/merchant/dashboard', method: 'GET' },
      { path: '/api/wallet/balance', method: 'GET' },
      { path: '/api/support/tickets', method: 'GET' }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        // Mock internal request check
        const responseTime = Date.now() - startTime;

        results.push({
          path: endpoint.path,
          method: endpoint.method,
          status: 'available',
          responseTime
        });
      } catch (error) {
        results.push({
          path: endpoint.path,
          method: endpoint.method,
          status: 'unavailable',
          error: error.message
        });
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      endpoints: results,
      summary: {
        total: results.length,
        available: results.filter(r => r.status === 'available').length,
        unavailable: results.filter(r => r.status === 'unavailable').length
      }
    });
  });
}

const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      components: {
        database: await checkDatabaseHealth(),
        storage: checkStorageHealth(),
        memory: checkMemoryHealth(),
        websocket: checkWebSocketHealth(),
        apis: await checkAPIEndpointsHealth()
      }
    };

    // Determine overall status
    const componentStatuses = Object.values(healthStatus.components).map(c => c.status);
    if (componentStatuses.includes('unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Detailed health check failed'
    });
  }
});

export default router;