import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

// Real-time tracking schemas
const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional()
  }).optional(),
  driverId: z.number().optional(),
  notes: z.string().optional()
});

const trackOrderSchema = z.object({
  orderId: z.string()
});

const updateDriverLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  orderId: z.string().optional()
});

export function registerRealTimeTrackingRoutes(app: Express) {
  // Update order status with real-time notifications
  app.put("/api/tracking/order-status", requireAuth, async (req, res) => {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Update order status
      const updatedOrder = await storage.updateOrderTracking(
        data.orderId,
        data.status,
        data.location
      );

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      // Prepare tracking update data
      const trackingUpdate = {
        orderId: data.orderId,
        status: data.status,
        location: data.location,
        driverId: data.driverId,
        notes: data.notes,
        timestamp: Date.now(),
        updatedBy: userId
      };

      // Emit real-time updates via WebSocket
      if (global.io) {
        // Notify all users in the order room
        global.io.to(`order_${data.orderId}`).emit('order_status_update', trackingUpdate);

        // Notify customer specifically
        if (updatedOrder.buyerId) {
          global.io.to(`user_${updatedOrder.buyerId}`).emit('order_update', {
            type: 'status_change',
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            timestamp: Date.now()
          });
        }

        // Notify merchant specifically
        if (updatedOrder.sellerId) {
          global.io.to(`user_${updatedOrder.sellerId}`).emit('order_update', {
            type: 'status_change',
            orderId: data.orderId,
            status: data.status,
            timestamp: Date.now()
          });
        }

        // Notify driver if assigned
        if (data.driverId) {
          global.io.to(`user_${data.driverId}`).emit('delivery_update', {
            type: 'status_change',
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            timestamp: Date.now()
          });
        }
      }

      res.json({
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
        trackingUpdate
      });

    } catch (error: any) {
      console.error('Order status update error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update order status"
      });
    }
  });

  // Get real-time order tracking information
  app.get("/api/tracking/order/:orderId", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session!.userId!;

      const trackingData = await storage.getOrderTracking(orderId);

      if (!trackingData) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      // Check if user has permission to view this order
      const hasPermission = 
        trackingData.buyerId === userId || 
        trackingData.sellerId === userId ||
        trackingData.driverId === userId;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Get driver location if assigned
      let driverLocation = null;
      if (trackingData.driverId) {
        const driverProfile = await storage.getDriverProfile(trackingData.driverId);
        if (driverProfile && driverProfile.currentLocation) {
          driverLocation = {
            latitude: driverProfile.currentLocation.latitude,
            longitude: driverProfile.currentLocation.longitude,
            timestamp: driverProfile.currentLocation.timestamp
          };
        }
      }

      res.json({
        success: true,
        tracking: {
          ...trackingData,
          driverLocation,
          lastUpdated: trackingData.updatedAt
        }
      });

    } catch (error: any) {
      console.error('Order tracking error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get order tracking"
      });
    }
  });

  // Update driver location in real-time
  app.put("/api/tracking/driver-location", requireAuth, async (req, res) => {
    try {
      const data = updateDriverLocationSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Update driver location
      await storage.updateDriverLocation(userId, {
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString()
      });

      // Prepare location update data
      const locationUpdate = {
        driverId: userId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: Date.now()
      };

      // Emit real-time location updates
      if (global.io) {
        // If orderId is provided, notify specific order room
        if (data.orderId) {
          global.io.to(`order_${data.orderId}`).emit('driver_location', locationUpdate);
        }

        // Notify admin dashboard
        global.io.to('admin_drivers').emit('driver_location_update', locationUpdate);
      }

      res.json({
        success: true,
        message: "Driver location updated successfully",
        location: locationUpdate
      });

    } catch (error: any) {
      console.error('Driver location update error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update driver location"
      });
    }
  });

  // Get live delivery tracking for drivers
  app.get("/api/tracking/deliveries/live", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      // Get active deliveries for the driver
      const activeDeliveries = await storage.getDriverOrders(userId, 'shipped');

      // Get real-time data for each delivery
      const liveDeliveries = await Promise.all(
        activeDeliveries.map(async (delivery) => {
          const trackingData = await storage.getOrderTracking(delivery.id);
          return {
            ...delivery,
            tracking: trackingData,
            lastUpdated: trackingData?.updatedAt
          };
        })
      );

      res.json({
        success: true,
        deliveries: liveDeliveries
      });

    } catch (error: any) {
      console.error('Live deliveries error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get live deliveries"
      });
    }
  });

  // Start real-time tracking session (join order room)
  app.post("/api/tracking/join/:orderId", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session!.userId!;

      // Verify user has access to this order
      const trackingData = await storage.getOrderTracking(orderId);
      
      if (!trackingData) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      const hasPermission = 
        trackingData.buyerId === userId || 
        trackingData.sellerId === userId ||
        trackingData.driverId === userId;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // This endpoint is mainly for validation
      // Actual room joining happens via WebSocket
      res.json({
        success: true,
        message: "Access granted for order tracking",
        orderId,
        userRole: trackingData.buyerId === userId ? 'customer' : 
                 trackingData.sellerId === userId ? 'merchant' : 'driver'
      });

    } catch (error: any) {
      console.error('Join tracking error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to join tracking session"
      });
    }
  });

  // Get delivery route optimization (for drivers)
  app.post("/api/tracking/optimize-route", requireAuth, async (req, res) => {
    try {
      const { deliveryIds, startLocation } = req.body;
      const userId = req.session!.userId!;

      // Verify driver owns these deliveries
      const deliveries = await Promise.all(
        deliveryIds.map((id: string) => storage.getOrderTracking(id))
      );

      const validDeliveries = deliveries.filter(
        delivery => delivery && delivery.driverId === userId
      );

      if (validDeliveries.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid deliveries found"
        });
      }

      // Simple route optimization (in production, integrate with Google Maps or similar)
      const optimizedRoute = validDeliveries.map((delivery, index) => ({
        orderId: delivery.id,
        sequence: index + 1,
        address: delivery.deliveryAddress,
        estimatedTime: (index + 1) * 15, // 15 minutes per stop
        customer: {
          name: delivery.customerName,
          phone: delivery.customerPhone
        }
      }));

      res.json({
        success: true,
        route: optimizedRoute,
        totalEstimatedTime: optimizedRoute.length * 15,
        totalDistance: `${optimizedRoute.length * 5} km` // Mock calculation
      });

    } catch (error: any) {
      console.error('Route optimization error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to optimize route"
      });
    }
  });
}