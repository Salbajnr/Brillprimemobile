import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { orderBroadcastingService } from "../services/order-broadcasting";

// Order Status Broadcasting schemas
const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered', 'cancelled']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional()
  }).optional(),
  estimatedTime: z.object({
    preparation: z.number().optional(), // minutes
    pickup: z.number().optional(),
    delivery: z.number().optional()
  }).optional(),
  notes: z.string().optional()
});

const updateKitchenStatusSchema = z.object({
  orderId: z.string(),
  kitchenStatus: z.enum(['received', 'preparing', 'ready_for_pickup', 'completed']),
  preparationTime: z.number().optional(),
  actualPreparationTime: z.number().optional(),
  items: z.array(z.object({
    productId: z.string(),
    status: z.enum(['pending', 'preparing', 'ready']),
    estimatedTime: z.number().optional()
  })).optional(),
  notes: z.string().optional()
});

const confirmPickupSchema = z.object({
  orderId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  photoProof: z.string().optional(),
  notes: z.string().optional()
});

const confirmDeliverySchema = z.object({
  orderId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  photoProof: z.string().optional(),
  signature: z.string().optional(),
  qrCode: z.string().optional(),
  customerFeedback: z.string().optional(),
  notes: z.string().optional()
});

export function registerOrderStatusRoutes(app: Express) {
  // Update order status (Merchant/Driver)
  app.put("/api/orders/status", requireAuth, async (req, res) => {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Verify user has permission to update this order
      const order = await storage.getOrderTracking(data.orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      const hasPermission = order.sellerId === userId || order.driverId === userId;
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const previousStatus = order.status;

      // Update order status in database
      const updatedOrder = await storage.updateOrderTracking(
        data.orderId,
        data.status,
        data.location
      );

      // Prepare status update for broadcasting
      const statusUpdate = {
        orderId: data.orderId,
        status: data.status,
        previousStatus,
        location: data.location,
        estimatedTime: data.estimatedTime,
        notes: data.notes,
        updatedBy: userId,
        timestamp: Date.now()
      };

      // Broadcast to all relevant parties
      await orderBroadcastingService.broadcastOrderStatus(statusUpdate);

      res.json({
        success: true,
        message: `Order status updated to ${data.status}`,
        order: updatedOrder,
        statusUpdate
      });

    } catch (error: any) {
      console.error('Order status update error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update order status"
      });
    }
  });

  // Update kitchen/preparation status (Merchant)
  app.put("/api/orders/kitchen-status", requireAuth, async (req, res) => {
    try {
      const data = updateKitchenStatusSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Verify merchant owns this order
      const order = await storage.getOrderTracking(data.orderId);
      if (!order || order.sellerId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied or order not found"
        });
      }

      // Prepare kitchen update
      const kitchenUpdate = {
        orderId: data.orderId,
        kitchenStatus: data.kitchenStatus,
        preparationTime: data.preparationTime,
        actualPreparationTime: data.actualPreparationTime,
        items: data.items,
        notes: data.notes,
        timestamp: Date.now()
      };

      // Broadcast kitchen update
      await orderBroadcastingService.broadcastKitchenUpdate(kitchenUpdate);

      // Update main order status if needed
      let newOrderStatus = order.status;
      switch (data.kitchenStatus) {
        case 'received':
          newOrderStatus = 'confirmed';
          break;
        case 'preparing':
          newOrderStatus = 'preparing';
          break;
        case 'ready_for_pickup':
          newOrderStatus = 'ready_for_pickup';
          break;
      }

      if (newOrderStatus !== order.status) {
        await storage.updateOrderTracking(data.orderId, newOrderStatus);
        
        await orderBroadcastingService.broadcastOrderStatus({
          orderId: data.orderId,
          status: newOrderStatus,
          previousStatus: order.status,
          estimatedTime: data.preparationTime ? { preparation: data.preparationTime } : undefined,
          notes: data.notes,
          updatedBy: userId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: `Kitchen status updated to ${data.kitchenStatus}`,
        kitchenUpdate,
        orderStatus: newOrderStatus
      });

    } catch (error: any) {
      console.error('Kitchen status update error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update kitchen status"
      });
    }
  });

  // Confirm pickup (Driver)
  app.post("/api/orders/confirm-pickup", requireAuth, async (req, res) => {
    try {
      const data = confirmPickupSchema.parse(req.body);
      const driverId = req.session!.userId!;

      // Verify driver is assigned to this order
      const order = await storage.getOrderTracking(data.orderId);
      if (!order || order.driverId !== driverId) {
        return res.status(403).json({
          success: false,
          message: "Access denied or order not found"
        });
      }

      // Update order status to picked up
      await storage.updateOrderTracking(data.orderId, 'picked_up', data.location);

      // Broadcast pickup confirmation
      await orderBroadcastingService.broadcastPickupConfirmation(
        data.orderId,
        driverId,
        {
          location: data.location,
          timestamp: Date.now(),
          photoProof: data.photoProof,
          notes: data.notes
        }
      );

      res.json({
        success: true,
        message: "Pickup confirmed successfully",
        orderId: data.orderId,
        pickupTime: Date.now()
      });

    } catch (error: any) {
      console.error('Pickup confirmation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to confirm pickup"
      });
    }
  });

  // Confirm delivery (Driver)
  app.post("/api/orders/confirm-delivery", requireAuth, async (req, res) => {
    try {
      const data = confirmDeliverySchema.parse(req.body);
      const driverId = req.session!.userId!;

      // Verify driver is assigned to this order
      const order = await storage.getOrderTracking(data.orderId);
      if (!order || order.driverId !== driverId) {
        return res.status(403).json({
          success: false,
          message: "Access denied or order not found"
        });
      }

      // Update order status to delivered
      await storage.updateOrderTracking(data.orderId, 'delivered', data.location);

      // Broadcast delivery confirmation
      await orderBroadcastingService.broadcastDeliveryConfirmation(
        data.orderId,
        {
          location: data.location,
          timestamp: Date.now(),
          photoProof: data.photoProof,
          signature: data.signature,
          qrCode: data.qrCode,
          customerFeedback: data.customerFeedback,
          notes: data.notes
        }
      );

      res.json({
        success: true,
        message: "Delivery confirmed successfully",
        orderId: data.orderId,
        deliveryTime: Date.now()
      });

    } catch (error: any) {
      console.error('Delivery confirmation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to confirm delivery"
      });
    }
  });

  // Get order status timeline
  app.get("/api/orders/:orderId/timeline", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session!.userId!;

      // Verify user has access to this order
      const order = await storage.getOrderTracking(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      const hasAccess = order.buyerId === userId || order.sellerId === userId || order.driverId === userId;
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Get status timeline (this would come from a status history table in production)
      const timeline = [
        {
          status: 'pending',
          timestamp: order.createdAt,
          description: 'Order placed',
          location: null
        },
        {
          status: order.status,
          timestamp: order.updatedAt,
          description: `Order ${order.status}`,
          location: order.currentLocation
        }
      ];

      res.json({
        success: true,
        timeline,
        currentStatus: order.status,
        estimatedDeliveryTime: order.estimatedDeliveryTime
      });

    } catch (error: any) {
      console.error('Order timeline error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get order timeline"
      });
    }
  });

  // Get live order updates (WebSocket endpoint info)
  app.get("/api/orders/:orderId/live-updates", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session!.userId!;

      // Verify access
      const order = await storage.getOrderTracking(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      const hasAccess = order.buyerId === userId || order.sellerId === userId || order.driverId === userId;
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      res.json({
        success: true,
        message: "Connect to WebSocket for live updates",
        websocketEvents: [
          'order_status_update',
          'kitchen_update',
          'driver_location_update',
          'pickup_confirmation',
          'delivery_confirmation'
        ],
        roomToJoin: `order_${orderId}`,
        currentStatus: order.status
      });

    } catch (error: any) {
      console.error('Live updates info error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get live updates info"
      });
    }
  });

  // Bulk update order statuses (Admin)
  app.put("/api/orders/bulk-status", requireAuth, async (req, res) => {
    try {
      const { orderIds, status, notes } = req.body;
      const userId = req.session!.userId!;

      // This would need admin authorization in production
      // For now, we'll allow any user to do bulk updates

      const results = [];

      for (const orderId of orderIds) {
        try {
          const order = await storage.getOrderTracking(orderId);
          if (order) {
            await storage.updateOrderTracking(orderId, status);
            
            await orderBroadcastingService.broadcastOrderStatus({
              orderId,
              status,
              previousStatus: order.status,
              notes,
              updatedBy: userId,
              timestamp: Date.now()
            });

            results.push({ orderId, success: true });
          } else {
            results.push({ orderId, success: false, error: 'Order not found' });
          }
        } catch (error: any) {
          results.push({ orderId, success: false, error: error.message });
        }
      }

      res.json({
        success: true,
        message: "Bulk update completed",
        results
      });

    } catch (error: any) {
      console.error('Bulk status update error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to update order statuses"
      });
    }
  });
}