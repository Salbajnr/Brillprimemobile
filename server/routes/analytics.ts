import { Router } from "express";
import { z } from "zod";
import { AnalyticsService } from "../services/analytics";
import { requireAuth } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/adminAuth";

const router = Router();

// User behavior tracking schema
const trackBehaviorSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum([
    "PAGE_VIEW", "CLICK", "SEARCH", "PURCHASE", "SCROLL", 
    "TIME_SPENT", "INTERACTION", "CONVERSION"
  ]),
  eventCategory: z.string(),
  eventAction: z.string(),
  eventLabel: z.string().optional(),
  eventValue: z.number().optional(),
  pagePath: z.string().optional(),
  pageTitle: z.string().optional(),
  referrer: z.string().optional(),
  deviceType: z.enum(["MOBILE", "TABLET", "DESKTOP"]).optional(),
  browserName: z.string().optional(),
  operatingSystem: z.string().optional(),
  screenResolution: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  networkType: z.string().optional(),
  duration: z.number().optional(),
  customDimensions: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Cross-role interaction schema
const trackInteractionSchema = z.object({
  initiatorId: z.number(),
  initiatorRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER"]),
  targetId: z.number(),
  targetRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER"]),
  interactionType: z.enum([
    "ORDER_PLACEMENT", "DELIVERY_REQUEST", "CHAT_INITIATION", 
    "REVIEW_SUBMISSION", "RECOMMENDATION", "DISPUTE"
  ]),
  relatedOrderId: z.string().optional(),
  relatedChatId: z.string().optional(),
  outcome: z.string().optional(),
  workflowStage: z.string().optional(),
  nextAction: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateInteractionSchema = z.object({
  status: z.enum(["INITIATED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "FAILED"]),
  outcome: z.string().optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
});

// System metric schema
const recordMetricSchema = z.object({
  metricType: z.enum([
    "PERFORMANCE", "USAGE", "BUSINESS", "TECHNICAL", "SECURITY", "USER_EXPERIENCE"
  ]),
  metricName: z.string(),
  metricCategory: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  dimensions: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  aggregationType: z.enum([
    "SUM", "AVERAGE", "COUNT", "MIN", "MAX", "MEDIAN", "PERCENTILE"
  ]).default("COUNT"),
  timeWindow: z.string().optional(),
  source: z.string().optional(),
  environment: z.string().default("production"),
  version: z.string().optional(),
});

// Track user behavior
router.post("/behavior", requireAuth, async (req, res) => {
  try {
    const validatedData = trackBehaviorSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await AnalyticsService.trackUserBehavior({
      userId,
      userRole: userRole as any,
      ...validatedData,
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Behavior tracked successfully",
        tracking: result.tracking 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Track cross-role interaction
router.post("/interactions", requireAuth, async (req, res) => {
  try {
    const validatedData = trackInteractionSchema.parse(req.body);

    const result = await AnalyticsService.trackCrossRoleInteraction(validatedData);

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Interaction tracked successfully",
        interaction: result.interaction 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Update interaction status
router.put("/interactions/:interactionId", requireAuth, async (req, res) => {
  try {
    const { interactionId } = req.params;
    const validatedData = updateInteractionSchema.parse(req.body);

    const result = await AnalyticsService.updateInteractionStatus(
      interactionId,
      validatedData.status,
      validatedData.outcome,
      validatedData.satisfactionRating
    );

    if (result.success) {
      res.json({ success: true, message: "Interaction updated successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Record system metric
router.post("/metrics", requireAuth, async (req, res) => {
  try {
    const validatedData = recordMetricSchema.parse(req.body);

    const result = await AnalyticsService.recordSystemMetric(validatedData);

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Metric recorded successfully",
        metric: result.metric 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// Get user engagement metrics
router.get("/engagement", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    const result = await AnalyticsService.getUserEngagementMetrics(userId, days);

    if (result.success) {
      res.json({ success: true, metrics: result.metrics });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get personalization profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await AnalyticsService.getPersonalizationProfile(userId);

    if (result.success) {
      res.json({ success: true, profile: result.profile });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get recommendations
router.get("/recommendations", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await AnalyticsService.generateRecommendations(userId);

    if (result.success) {
      res.json({ success: true, recommendations: result.recommendations });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Calculate churn risk
router.get("/churn-risk", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await AnalyticsService.calculateChurnRisk(userId);

    if (result.success) {
      res.json({ success: true, churnRisk: result.churnRisk });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Admin Analytics Routes

// Get platform usage metrics
router.get("/admin/platform-usage", requireAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const result = await AnalyticsService.getPlatformUsageMetrics(days);

    if (result.success) {
      res.json({ success: true, usage: result.usage });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get interaction flow metrics
router.get("/admin/interaction-flows", requireAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const result = await AnalyticsService.getInteractionFlowMetrics(days);

    if (result.success) {
      res.json({ success: true, flows: result.flows });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get dashboard metrics
router.get("/admin/dashboard", requireAdminAuth, async (req, res) => {
  try {
    const result = await AnalyticsService.getDashboardMetrics();

    if (result.success) {
      res.json({ success: true, dashboard: result.dashboard });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Dashboard Analytics Endpoints

// Get user dashboard analytics
router.get("/dashboard/user", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const days = parseInt(req.query.days as string) || 30;

    let dashboardData;

    switch (userRole) {
      case 'CONSUMER':
        dashboardData = await AnalyticsService.getConsumerDashboard(userId, days);
        break;
      case 'MERCHANT':
        dashboardData = await AnalyticsService.getMerchantDashboard(userId, days);
        break;
      case 'DRIVER':
        dashboardData = await AnalyticsService.getDriverDashboard(userId, days);
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid user role" });
    }

    if (dashboardData.success) {
      res.json({ success: true, dashboard: dashboardData.dashboard });
    } else {
      res.status(500).json({ success: false, error: dashboardData.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get real-time metrics
router.get("/realtime/metrics", requireAuth, async (req, res) => {
  try {
    const metrics = await AnalyticsService.getRealTimeMetrics();

    if (metrics.success) {
      res.json({ success: true, metrics: metrics.data });
    } else {
      res.status(500).json({ success: false, error: metrics.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get order analytics
router.get("/orders/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { period = '7d', orderType } = req.query;

    const analytics = await AnalyticsService.getOrderAnalytics(userId, {
      period: period as string,
      orderType: orderType as string
    });

    if (analytics.success) {
      res.json({ success: true, analytics: analytics.data });
    } else {
      res.status(500).json({ success: false, error: analytics.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get revenue analytics (Merchant/Admin only)
router.get("/revenue/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'MERCHANT' && userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { period = '30d', breakdown = 'daily' } = req.query;

    const analytics = await AnalyticsService.getRevenueAnalytics(userId, {
      period: period as string,
      breakdown: breakdown as string
    });

    if (analytics.success) {
      res.json({ success: true, analytics: analytics.data });
    } else {
      res.status(500).json({ success: false, error: analytics.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get performance analytics
router.get("/performance/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const days = parseInt(req.query.days as string) || 7;

    const analytics = await AnalyticsService.getPerformanceAnalytics(userId, userRole as any, days);

    if (analytics.success) {
      res.json({ success: true, analytics: analytics.data });
    } else {
      res.status(500).json({ success: false, error: analytics.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Add missing log-error endpoint
router.post('/log-error', (req, res) => {
  console.error('Frontend error:', req.body);
  res.json({ success: true, message: 'Error logged' });
});

// Analytics routes
router.get('/overview', async (req, res) => {
  try {
    // Get overview analytics
    const analytics = await AnalyticsService.getOverviewAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// Real-time metrics endpoint
router.get('/metrics/realtime', async (req, res) => {
  try {
    const metrics = await AnalyticsService.getRealTimeMetrics();
    res.json({
      success: true,
      data: {
        activeUsers: metrics.activeUsers,
        activeOrders: metrics.activeOrders,
        systemLoad: metrics.systemLoad,
        responseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time metrics'
    });
  }
});

// User behavior analytics
router.get('/user-behavior', async (req, res) => {
  try {
    const { timeframe = '7d', userRole } = req.query;
    const behavior = await AnalyticsService.getUserBehaviorAnalytics(timeframe as string, userRole as string);

    res.json({
      success: true,
      data: behavior
    });
  } catch (error) {
    console.error('User behavior analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user behavior analytics'
    });
  }
});

// Revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    if (!req.session?.userId || req.session.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeframe = '30d' } = req.query;
    const revenue = await AnalyticsService.getRevenueAnalytics(timeframe as string);

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics'
    });
  }
});

// Performance metrics
router.get('/performance', async (req, res) => {
  try {
    const performance = await AnalyticsService.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        databaseQueries: performance.databaseQueries,
        cacheHitRate: performance.cacheHitRate,
        memoryUsage: performance.memoryUsage,
        cpuUsage: performance.cpuUsage,
        activeConnections: performance.activeConnections
      }
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

// Track custom event
router.post('/events', async (req, res) => {
  try {
    const { eventType, eventData, userId } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }

    await AnalyticsService.trackEvent({
      type: eventType,
      data: eventData,
      userId: userId || req.session?.userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

export default router;