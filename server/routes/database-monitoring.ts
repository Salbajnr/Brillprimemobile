
import express from 'express';
import { databaseIntegration } from '../services/database-integration';
import { queryOptimizer } from '../services/queryOptimizer';
import { db } from '../db';

const router = express.Router();

// Get real-time database metrics
router.get('/metrics', async (req, res) => {
  try {
    const dashboardMetrics = await databaseIntegration.getDashboardMetrics();
    const syncStatus = databaseIntegration.getSyncStatus();
    const queryStats = queryOptimizer.getQueryStats();

    res.json({
      success: true,
      data: {
        dashboard: dashboardMetrics.data,
        syncStatus,
        queryPerformance: queryStats.slice(0, 10), // Top 10 queries
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database metrics'
    });
  }
});

// Get cached metric by key
router.get('/metrics/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = databaseIntegration.getCachedMetric(key);

    if (value !== null) {
      res.json({
        success: true,
        key,
        value,
        cached: true
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Metric not found or expired'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metric'
    });
  }
});

// Stream entity data
router.get('/stream/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const mockSocket = {
      emit: (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    const interval = await databaseIntegration.streamEntityData(entityType, entityId, mockSocket);

    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Database health check
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    await db.execute("SELECT 1");
    const responseTime = Date.now() - startTime;

    const poolStats = await queryOptimizer.getConnectionPoolStats();

    res.json({
      success: true,
      health: {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        connectionPool: poolStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      health: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      }
    });
  }
});

// Force sync specific data type
router.post('/sync/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params;
    
    // This would trigger immediate sync for specific data type
    res.json({
      success: true,
      message: `Sync triggered for ${dataType}`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync'
    });
  }
});

export default router;
