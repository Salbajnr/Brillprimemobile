
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { db } from "../db";
import { errorLogs } from "../db";
import { eq, desc, gte, and, count } from "drizzle-orm";
import { loggingService } from "../services/logging";

const router = Router();

// Get error statistics for admin dashboard
router.get("/admin/error-stats", requireAdmin, async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get error counts by severity
    const errorStats = await db
      .select({
        severity: errorLogs.severity,
        count: count()
      })
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, last24Hours))
      .groupBy(errorLogs.severity);

    // Get recent critical errors
    const criticalErrors = await db
      .select()
      .from(errorLogs)
      .where(
        and(
          eq(errorLogs.severity, 'CRITICAL'),
          gte(errorLogs.timestamp, last7Days)
        )
      )
      .orderBy(desc(errorLogs.timestamp))
      .limit(10);

    // Get error trends
    const errorTrends = await db
      .select({
        date: errorLogs.timestamp,
        count: count()
      })
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, last7Days))
      .groupBy(errorLogs.timestamp)
      .orderBy(desc(errorLogs.timestamp));

    res.json({
      success: true,
      data: {
        stats: errorStats,
        criticalErrors,
        trends: errorTrends,
        period: '24h'
      }
    });

  } catch (error) {
    loggingService.error('Failed to get error statistics', error as Error, {
      userId: req.user?.id,
      route: '/admin/error-stats'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve error statistics'
    });
  }
});

// Get application logs for admin
router.get("/admin/logs", requireAdmin, async (req, res) => {
  try {
    const { level, source, limit = 100, offset = 0 } = req.query;
    
    let query = db.select().from(errorLogs);
    
    if (level) {
      query = query.where(eq(errorLogs.severity, level as any));
    }
    
    if (source) {
      query = query.where(eq(errorLogs.source, source as any));
    }

    const logs = await query
      .orderBy(desc(errorLogs.timestamp))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    loggingService.error('Failed to get application logs', error as Error, {
      userId: req.user?.id,
      route: '/admin/logs'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Mark error as resolved
router.patch("/admin/errors/:errorId/resolve", requireAdmin, async (req, res) => {
  try {
    const { errorId } = req.params;
    
    await db
      .update(errorLogs)
      .set({ 
        resolved: new Date(),
        updatedAt: new Date()
      })
      .where(eq(errorLogs.id, parseInt(errorId)));

    loggingService.logAudit(
      'ERROR_RESOLVED',
      req.user!.id,
      'error_log',
      errorId
    );

    res.json({
      success: true,
      message: 'Error marked as resolved'
    });

  } catch (error) {
    loggingService.error('Failed to resolve error', error as Error, {
      userId: req.user?.id,
      route: '/admin/errors/resolve',
      metadata: { errorId: req.params.errorId }
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to resolve error'
    });
  }
});

// Get system health metrics
router.get("/admin/health", requireAdmin, async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const health = {
      status: 'healthy',
      uptime: {
        seconds: uptime,
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      timestamp: new Date().toISOString()
    };

    loggingService.logPerformance({
      operation: 'health_check',
      duration: 0,
      success: true,
      resourceUsage: {
        memory: health.memory.used,
        cpu: health.cpu.user + health.cpu.system
      }
    });

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    loggingService.error('Failed to get system health', error as Error, {
      userId: req.user?.id,
      route: '/admin/health'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health'
    });
  }
});

export default router;
