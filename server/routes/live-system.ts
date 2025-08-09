import { Router } from "express";
import { z } from "zod";
import { LiveSystemService } from "../services/live-system";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Notification schemas
const createNotificationSchema = z.object({
  userId: z.number().optional(), // If not provided, uses authenticated user
  notificationType: z.enum([
    "ORDER_UPDATE", "CHAT_MESSAGE", "PAYMENT_UPDATE", "LOCATION_UPDATE", 
    "PROMOTION", "SYSTEM_ALERT", "EMERGENCY"
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT", "EMERGENCY"]).default("MEDIUM"),
  category: z.enum(["TRANSACTIONAL", "PROMOTIONAL", "INFORMATIONAL", "SECURITY"]),
  channels: z.array(z.enum(["PUSH", "EMAIL", "SMS", "WEBSOCKET", "IN_APP"])),
  actionUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().optional().transform(str => str ? new Date(str) : undefined),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

// Location tracking schema
const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  trackingType: z.enum([
    "DRIVER_DELIVERY", "CUSTOMER_PICKUP", "MERCHANT_LOCATION", "EMERGENCY", "GENERAL"
  ]),
  relatedOrderId: z.string().optional(),
  relatedDeliveryId: z.string().optional(),
  sharingLevel: z.enum(["PUBLIC", "CUSTOMERS_ONLY", "MERCHANTS_ONLY", "PRIVATE"]).default("CUSTOMERS_ONLY"),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
});

// Create notification
router.post("/notifications", requireAuth, async (req, res) => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);
    const userId = validatedData.userId || req.user!.id;

    const result = await LiveSystemService.createNotification({
      userId,
      ...validatedData,
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Notification created successfully",
        notification: result.notification 
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

// Get user notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await LiveSystemService.getUserNotifications(userId, limit, unreadOnly);

    if (result.success) {
      res.json({ success: true, notifications: result.notifications });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Mark notification as read
router.post("/notifications/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const result = await LiveSystemService.markNotificationAsRead(notificationId, userId);

    if (result.success) {
      res.json({ success: true, message: "Notification marked as read" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Update location
router.post("/location", requireAuth, async (req, res) => {
  try {
    const validatedData = locationUpdateSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await LiveSystemService.updateLocation({
      userId,
      userRole: userRole as any,
      ...validatedData,
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Location updated successfully",
        location: result.location 
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

// Get nearby drivers
router.get("/drivers/nearby", requireAuth, async (req, res) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radius = parseFloat(req.query.radius as string) || 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        success: false, 
        error: "Valid latitude and longitude are required" 
      });
    }

    const result = await LiveSystemService.getActiveDriversNearLocation(latitude, longitude, radius);

    if (result.success) {
      res.json({ success: true, drivers: result.drivers });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Broadcast to user (admin/system use)
router.post("/broadcast/user/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ 
        success: false, 
        error: "Event and data are required" 
      });
    }

    const result = await LiveSystemService.broadcastToUser(parseInt(userId), event, data);

    if (result.success) {
      res.json({ success: true, message: "Broadcast sent successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Broadcast to role (admin/system use)
router.post("/broadcast/role/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params;
    const { event, data } = req.body;

    if (!["CONSUMER", "MERCHANT", "DRIVER", "ADMIN"].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    if (!event || !data) {
      return res.status(400).json({ 
        success: false, 
        error: "Event and data are required" 
      });
    }

    const result = await LiveSystemService.broadcastToRole(role, event, data);

    if (result.success) {
      res.json({ success: true, message: "Broadcast sent successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Broadcast order update
router.post("/broadcast/order/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, updates } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: "Status is required" 
      });
    }

    const result = await LiveSystemService.broadcastOrderUpdate(orderId, status, updates);

    if (result.success) {
      res.json({ success: true, message: "Order update broadcast successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get system metrics
router.get("/metrics", requireAuth, async (req, res) => {
  try {
    const result = await LiveSystemService.getSystemMetrics();

    if (result.success) {
      res.json({ success: true, metrics: result.metrics });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// WebSocket connection management endpoints
router.post("/websocket/register", requireAuth, async (req, res) => {
  try {
    const { socketId, connectionType } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!socketId || !connectionType) {
      return res.status(400).json({ 
        success: false, 
        error: "Socket ID and connection type are required" 
      });
    }

    const result = await LiveSystemService.registerConnection({
      userId,
      socketId,
      userRole: userRole as any,
      connectionType: connectionType as any,
      metadata: req.body.metadata || {},
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Connection registered successfully",
        connection: result.connection 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/websocket/activity/:socketId", requireAuth, async (req, res) => {
  try {
    const { socketId } = req.params;

    const result = await LiveSystemService.updateConnectionActivity(socketId);

    if (result.success) {
      res.json({ success: true, message: "Activity updated" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/websocket/disconnect/:socketId", requireAuth, async (req, res) => {
  try {
    const { socketId } = req.params;

    const result = await LiveSystemService.disconnectConnection(socketId);

    if (result.success) {
      res.json({ success: true, message: "Connection disconnected" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;