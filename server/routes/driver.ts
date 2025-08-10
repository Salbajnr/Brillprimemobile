import { Router } from "express";
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// Validation schemas
const updateDriverStatusSchema = z.object({
  isOnline: z.boolean(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

const acceptDeliverySchema = z.object({
  deliveryId: z.string()
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'HEADING_TO_PICKUP', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']),
  proof: z.object({
    type: z.enum(['photo', 'signature']),
    data: z.string()
  }).optional(),
  notes: z.string().optional()
});

export function registerDriverRoutes(app: Express) {
  // Get driver profile
  router.get("/profile", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;
      const driverProfile = await storage.getDriverProfile(driverId);

      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      // Transform to match frontend interface
      const transformedProfile = {
        id: driverProfile.id,
        userId: driverProfile.userId,
        vehicleType: driverProfile.vehicleType,
        vehiclePlate: driverProfile.vehiclePlate,
        vehicleModel: driverProfile.vehicleModel,
        isAvailable: driverProfile.isAvailable,
        isOnline: driverProfile.isOnline || false,
        currentLocation: driverProfile.currentLocation,
        totalDeliveries: driverProfile.totalDeliveries || 0,
        totalEarnings: driverProfile.totalEarnings || 0,
        rating: driverProfile.rating || 0,
        reviewCount: driverProfile.reviewCount || 0,
        tier: driverProfile.tier || 'STANDARD',
        verificationStatus: driverProfile.verificationStatus || 'PENDING'
      };

      res.json(transformedProfile);
    } catch (error) {
      console.error("Get driver profile error:", error);
      res.status(500).json({ message: "Failed to fetch driver profile" });
    }
  });

  // Update driver online/offline status
  router.put("/status", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;
      const validatedData = updateDriverStatusSchema.parse(req.body);

      await storage.updateDriverStatus(driverId, validatedData.isOnline, validatedData.location);

      // If going online, join driver room for real-time updates
      if (global.io && validatedData.isOnline) {
        // This would typically be handled in the WebSocket connection
        global.io.to(`user_${driverId}`).emit('status_updated', {
          isOnline: validatedData.isOnline,
          timestamp: Date.now()
        });
      }

      res.json({ 
        success: true, 
        isOnline: validatedData.isOnline 
      });
    } catch (error: any) {
      console.error("Update driver status error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Get available delivery requests
  router.get("/delivery-requests", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;

      // Get driver's current location to find nearby requests
      const driverProfile = await storage.getDriverProfile(driverId);
      if (!driverProfile || !driverProfile.isOnline) {
        return res.json([]);
      }

      // Get nearby delivery requests
      const deliveryRequests = await storage.getAvailableDeliveryRequests(driverId);

      // Transform to match frontend interface
      const transformedRequests = deliveryRequests.map((request: any) => ({
        id: request.id,
        orderId: request.orderId,
        deliveryType: request.deliveryType || 'PACKAGE',
        pickupAddress: request.pickupAddress,
        deliveryAddress: request.deliveryAddress,
        pickupCoords: request.pickupCoords || { lat: 0, lng: 0 },
        deliveryCoords: request.deliveryCoords || { lat: 0, lng: 0 },
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        merchantName: request.merchantName || 'Merchant',
        merchantPhone: request.merchantPhone,
        deliveryFee: request.deliveryFee,
        distance: request.distance || 5.0,
        estimatedTime: request.estimatedTime || 30,
        orderValue: request.orderValue,
        paymentMethod: request.paymentMethod || 'Card',
        specialInstructions: request.specialInstructions,
        urgentDelivery: request.urgentDelivery || false,
        temperatureSensitive: request.temperatureSensitive || false,
        fragile: request.fragile || false,
        requiresVerification: request.requiresVerification || false,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt
      }));

      res.json(transformedRequests);
    } catch (error) {
      console.error("Get delivery requests error:", error);
      res.status(500).json({ message: "Failed to fetch delivery requests" });
    }
  });

  // Accept delivery request
  router.post("/accept-delivery/:requestId", requireAuth, async (req, res) => {
    try {
      const { requestId } = req.params;
      const driverId = req.session!.userId!;

      // Check if driver is available
      const driverProfile = await storage.getDriverProfile(driverId);
      if (!driverProfile || !driverProfile.isAvailable || !driverProfile.isOnline) {
        return res.status(400).json({ message: "Driver not available" });
      }

      // Accept the delivery
      const acceptedDelivery = await storage.acceptDeliveryRequest(requestId, driverId);

      // Update driver availability
      await storage.updateDriverAvailability(driverId, false);

      // Create active delivery object
      const activeDelivery = {
        id: acceptedDelivery.id,
        orderId: acceptedDelivery.orderId,
        status: 'ACCEPTED',
        customerName: acceptedDelivery.customerName,
        customerPhone: acceptedDelivery.customerPhone,
        pickupAddress: acceptedDelivery.pickupAddress,
        deliveryAddress: acceptedDelivery.deliveryAddress,
        deliveryFee: acceptedDelivery.deliveryFee,
        estimatedDeliveryTime: new Date(Date.now() + acceptedDelivery.estimatedTime * 60 * 1000),
        orderItems: acceptedDelivery.orderItems || [],
        specialHandling: [],
        deliveryInstructions: acceptedDelivery.specialInstructions
      };

      // Emit real-time updates
      if (global.io) {
        // Notify merchant
        if (acceptedDelivery.merchantId) {
          global.io.to(`user_${acceptedDelivery.merchantId}`).emit('delivery_accepted', {
            deliveryId: requestId,
            driverId,
            driverName: 'Driver', // Get actual driver name
            timestamp: Date.now()
          });
        }

        // Notify customer
        if (acceptedDelivery.customerId) {
          global.io.to(`user_${acceptedDelivery.customerId}`).emit('delivery_assigned', {
            deliveryId: requestId,
            driverId,
            status: 'ACCEPTED',
            timestamp: Date.now()
          });
        }
      }

      res.json({ 
        success: true, 
        delivery: activeDelivery
      });
    } catch (error) {
      console.error("Accept delivery error:", error);
      res.status(500).json({ message: "Failed to accept delivery" });
    }
  });

  // Update delivery status
  router.put("/delivery/:deliveryId/status", requireAuth, async (req, res) => {
    try {
      const { deliveryId } = req.params;
      const driverId = req.session!.userId!;
      const validatedData = updateDeliveryStatusSchema.parse(req.body);

      // Verify driver ownership of delivery
      const delivery = await storage.getDeliveryById(deliveryId);
      if (!delivery || delivery.driverId !== driverId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update delivery status
      const updatedDelivery = await storage.updateDeliveryStatus(
        deliveryId, 
        validatedData.status,
        {
          proof: validatedData.proof,
          notes: validatedData.notes,
          location: req.body.location
        }
      );

      // If delivery is completed, update driver availability and earnings
      if (validatedData.status === 'DELIVERED') {
        await storage.updateDriverAvailability(driverId, true);
        await storage.updateDriverEarnings(driverId, delivery.deliveryFee);
      }

      // Emit real-time updates
      if (global.io) {
        const statusUpdate = {
          deliveryId,
          status: validatedData.status,
          proof: validatedData.proof,
          notes: validatedData.notes,
          timestamp: Date.now()
        };

        // Notify merchant
        if (delivery.merchantId) {
          global.io.to(`user_${delivery.merchantId}`).emit('delivery_status_update', statusUpdate);
        }

        // Notify customer
        if (delivery.customerId) {
          global.io.to(`user_${delivery.customerId}`).emit('delivery_status_update', statusUpdate);
        }
      }

      res.json({ 
        success: true, 
        delivery: updatedDelivery
      });
    } catch (error: any) {
      console.error("Update delivery status error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update delivery status" });
    }
  });

  // Get driver earnings
  router.get("/earnings", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;

      const earnings = {
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        totalEarnings: 0,
        completedDeliveries: 0,
        bonusEarnings: 0,
        pendingEarnings: 0,
        averageDeliveryTime: 0,
        onTimeDeliveryRate: 0
      };

      // Get delivery history for different periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayDeliveries = await storage.getDriverDeliveriesForDate(driverId, today);
      const weekDeliveries = await storage.getDriverDeliveriesForPeriod(driverId, weekStart, now);
      const monthDeliveries = await storage.getDriverDeliveriesForPeriod(driverId, monthStart, now);
      const allDeliveries = await storage.getDriverDeliveries(driverId);

      earnings.todayEarnings = todayDeliveries.reduce((sum: number, d: any) => sum + d.deliveryFee, 0);
      earnings.weeklyEarnings = weekDeliveries.reduce((sum: number, d: any) => sum + d.deliveryFee, 0);
      earnings.monthlyEarnings = monthDeliveries.reduce((sum: number, d: any) => sum + d.deliveryFee, 0);
      earnings.totalEarnings = allDeliveries.reduce((sum: number, d: any) => sum + d.deliveryFee, 0);

      earnings.completedDeliveries = allDeliveries.filter((d: any) => d.status === 'DELIVERED').length;

      // Calculate performance metrics (mock data for now)
      earnings.averageDeliveryTime = 25;
      earnings.onTimeDeliveryRate = 92;
      earnings.bonusEarnings = earnings.monthlyEarnings * 0.1; // 10% bonus
      earnings.pendingEarnings = earnings.todayEarnings * 0.2; // 20% pending

      res.json(earnings);
    } catch (error) {
      console.error("Get driver earnings error:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Get driver delivery history
  router.get("/deliveries", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;
      const { status, limit = 50 } = req.query;

      let deliveries = await storage.getDriverDeliveries(driverId);

      if (status && status !== 'all') {
        deliveries = deliveries.filter((delivery: any) => delivery.status === status);
      }

      // Limit results
      deliveries = deliveries.slice(0, parseInt(limit as string));

      res.json(deliveries);
    } catch (error) {
      console.error("Get driver deliveries error:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  app.use('/api/driver', router);
}