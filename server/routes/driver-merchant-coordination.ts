
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Validation schemas
const coordinationRequestSchema = z.object({
  orderId: z.string(),
  merchantId: z.number(),
  driverId: z.number(),
  requestType: z.enum(['PICKUP_READY', 'DELIVERY_CONFIRMATION', 'ISSUE_REPORT']),
  message: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  estimatedTime: z.number().optional()
});

const responseSchema = z.object({
  coordinationId: z.string(),
  response: z.enum(['ACKNOWLEDGED', 'CONFIRMED', 'REJECTED']),
  message: z.string().optional(),
  newEstimatedTime: z.number().optional()
});

// Create coordination request
router.post("/request", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const validatedData = coordinationRequestSchema.parse(req.body);

    // Verify user has permission for this order
    const order = await storage.getOrderById(validatedData.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const hasPermission = order.customerId === userId || 
                         order.merchantId === userId || 
                         order.driverId === userId;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const coordination = await storage.createCoordinationRequest({
      ...validatedData,
      requesterId: userId,
      status: 'PENDING',
      createdAt: new Date()
    });

    // Send real-time notification
    if ((global as any).io) {
      const targetUserId = validatedData.requestType === 'PICKUP_READY' 
        ? validatedData.driverId 
        : validatedData.merchantId;

      (global as any).io.to(`user_${targetUserId}`).emit('coordination_request', {
        coordinationId: coordination.id,
        orderId: validatedData.orderId,
        requestType: validatedData.requestType,
        message: validatedData.message,
        requesterId: userId,
        timestamp: Date.now()
      });
    }

    res.status(201).json({
      success: true,
      message: "Coordination request sent",
      coordination
    });
  } catch (error: any) {
    console.error("Create coordination request error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create coordination request"
    });
  }
});

// Respond to coordination request
router.post("/respond", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const validatedData = responseSchema.parse(req.body);

    const coordination = await storage.getCoordinationRequest(validatedData.coordinationId);
    if (!coordination) {
      return res.status(404).json({
        success: false,
        message: "Coordination request not found"
      });
    }

    // Verify user can respond to this request
    const order = await storage.getOrderById(coordination.orderId);
    const canRespond = order && (order.merchantId === userId || order.driverId === userId);

    if (!canRespond) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const updatedCoordination = await storage.updateCoordinationRequest(
      validatedData.coordinationId,
      {
        status: validatedData.response,
        response: validatedData.message,
        responderId: userId,
        respondedAt: new Date(),
        newEstimatedTime: validatedData.newEstimatedTime
      }
    );

    // Send real-time notification
    if ((global as any).io) {
      (global as any).io.to(`user_${coordination.requesterId}`).emit('coordination_response', {
        coordinationId: validatedData.coordinationId,
        response: validatedData.response,
        message: validatedData.message,
        responderId: userId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Response sent successfully",
      coordination: updatedCoordination
    });
  } catch (error: any) {
    console.error("Respond to coordination error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid response data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to send response"
    });
  }
});

// Get coordination history for order
router.get("/order/:orderId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { orderId } = req.params;

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const hasAccess = order.customerId === userId || 
                     order.merchantId === userId || 
                     order.driverId === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const coordinationHistory = await storage.getOrderCoordinationHistory(orderId);

    res.json({
      success: true,
      coordinationHistory
    });
  } catch (error) {
    console.error("Get coordination history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coordination history"
    });
  }
});

// Get active coordination requests for user
router.get("/active", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const activeRequests = await storage.getActiveCoordinationRequests(userId);

    res.json({
      success: true,
      requests: activeRequests
    });
  } catch (error) {
    console.error("Get active coordination requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active requests"
    });
  }
});

export default router;
