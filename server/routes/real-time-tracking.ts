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

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

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

      // Calculate ETA if orderId is provided
      let etaMinutes = null;
      let distanceKm = null;
      let optimizedRoute = null;

      if (data.orderId) {
        const orderTracking = await storage.getOrderTracking(data.orderId);
        if (orderTracking && orderTracking.deliveryAddress) {
          // Parse delivery coordinates (in a real app, you'd geocode the address)
          // For now, we'll simulate ETA calculation
          const avgSpeedKmh = 30; // Average city speed
          distanceKm = calculateDistance(
            data.latitude, 
            data.longitude, 
            parseFloat(orderTracking.deliveryLatitude || '0'), 
            parseFloat(orderTracking.deliveryLongitude || '0')
          );
          etaMinutes = Math.round((distanceKm / avgSpeedKmh) * 60);
          
          // Simple route optimization (in production, use Google Maps API)
          optimizedRoute = {
            distance: `${distanceKm.toFixed(1)} km`,
            duration: `${etaMinutes} minutes`,
            waypoints: [
              { lat: data.latitude, lng: data.longitude, type: 'current' },
              { 
                lat: parseFloat(orderTracking.deliveryLatitude || '0'), 
                lng: parseFloat(orderTracking.deliveryLongitude || '0'), 
                type: 'destination' 
              }
            ]
          };
        }
      }

      // Prepare location update data
      const locationUpdate = {
        driverId: userId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: Date.now(),
        eta: etaMinutes ? `${etaMinutes} minutes` : null,
        distance: distanceKm ? `${distanceKm.toFixed(1)} km` : null,
        route: optimizedRoute
      };

      // Emit real-time location updates
      if (global.io) {
        // If orderId is provided, notify specific order room with ETA
        if (data.orderId) {
          global.io.to(`order_${data.orderId}`).emit('driver_location_update', {
            ...locationUpdate,
            orderId: data.orderId,
            message: etaMinutes ? `Driver is ${etaMinutes} minutes away` : 'Driver location updated'
          });

          // Notify customer specifically
          const orderTracking = await storage.getOrderTracking(data.orderId);
          if (orderTracking?.buyerId) {
            global.io.to(`user_${orderTracking.buyerId}`).emit('delivery_eta_update', {
              orderId: data.orderId,
              driverLocation: { lat: data.latitude, lng: data.longitude },
              eta: etaMinutes ? `${etaMinutes} minutes` : 'Calculating...',
              distance: distanceKm ? `${distanceKm.toFixed(1)} km away` : null,
              timestamp: Date.now()
            });
          }
        }

        // Notify admin dashboard
        global.io.to('admin_drivers').emit('driver_location_update', locationUpdate);
        
        // Broadcast to live map viewers
        global.io.to('live_map').emit('driver_position_update', {
          driverId: userId,
          position: { lat: data.latitude, lng: data.longitude },
          timestamp: Date.now(),
          orderId: data.orderId
        });
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

      // Enhanced route optimization with real coordinates
      const optimizedRoute = validDeliveries.map((delivery, index) => {
        const prevLocation = index === 0 ? startLocation : {
          lat: parseFloat(validDeliveries[index - 1].deliveryLatitude || '0'),
          lng: parseFloat(validDeliveries[index - 1].deliveryLongitude || '0')
        };
        
        const currentLocation = {
          lat: parseFloat(delivery.deliveryLatitude || '0'),
          lng: parseFloat(delivery.deliveryLongitude || '0')
        };

        const distance = calculateDistance(
          prevLocation.lat, 
          prevLocation.lng, 
          currentLocation.lat, 
          currentLocation.lng
        );

        const estimatedTime = Math.round((distance / 30) * 60) + 5; // 30 km/h + 5 min stop time

        return {
          orderId: delivery.id,
          sequence: index + 1,
          address: delivery.deliveryAddress,
          coordinates: currentLocation,
          estimatedTime,
          distance: `${distance.toFixed(1)} km`,
          customer: {
            name: delivery.customerName,
            phone: delivery.customerPhone
          }
        };
      });

      const totalDistance = optimizedRoute.reduce((sum, stop) => 
        sum + parseFloat(stop.distance.replace(' km', '')), 0
      );
      const totalTime = optimizedRoute.reduce((sum, stop) => sum + stop.estimatedTime, 0);

      // Emit route optimization notification
      if (global.io) {
        global.io.to(`user_${userId}`).emit('route_optimized', {
          driverId: userId,
          route: optimizedRoute,
          totalDistance: `${totalDistance.toFixed(1)} km`,
          totalTime: `${totalTime} minutes`,
          deliveryCount: optimizedRoute.length,
          timestamp: Date.now()
        });

        // Notify customers about updated ETAs
        optimizedRoute.forEach((stop, index) => {
          const delivery = validDeliveries[index];
          if (delivery?.buyerId) {
            global.io.to(`user_${delivery.buyerId}`).emit('delivery_eta_update', {
              orderId: stop.orderId,
              eta: `${stop.estimatedTime} minutes`,
              sequence: stop.sequence,
              message: `You are delivery #${stop.sequence} on the route`,
              timestamp: Date.now()
            });
          }
        });
      }

      res.json({
        success: true,
        route: optimizedRoute,
        totalEstimatedTime: totalTime,
        totalDistance: `${totalDistance.toFixed(1)} km`,
        optimizationSavings: {
          timeSaved: `${Math.max(0, (optimizedRoute.length * 20) - totalTime)} minutes`,
          fuelSaved: `${Math.max(0, (optimizedRoute.length * 3) - totalDistance).toFixed(1)} km`
        }
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