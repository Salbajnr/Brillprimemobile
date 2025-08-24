
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

    // Get delivery history for different periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayDeliveries = await storage.getDriverDeliveriesForDate(driverId, today);
    const weekDeliveries = await storage.getDriverDeliveriesForPeriod(driverId, weekStart, now);
    const monthDeliveries = await storage.getDriverDeliveriesForPeriod(driverId, monthStart, now);
    const allDeliveries = await storage.getDriverDeliveries(driverId);

    // Calculate earnings
    const todayEarnings = todayDeliveries.reduce((sum: number, d: any) => sum + (d.deliveryFee || 0), 0);
    const weeklyEarnings = weekDeliveries.reduce((sum: number, d: any) => sum + (d.deliveryFee || 0), 0);
    const monthlyEarnings = monthDeliveries.reduce((sum: number, d: any) => sum + (d.deliveryFee || 0), 0);
    const totalEarnings = allDeliveries.reduce((sum: number, d: any) => sum + (d.deliveryFee || 0), 0);

    // Calculate performance metrics
    const completedDeliveries = allDeliveries.filter((d: any) => d.status === 'delivered').length;
    const todayCompletedDeliveries = todayDeliveries.filter((d: any) => d.status === 'delivered').length;
    
    // Calculate on-time delivery rate from recent deliveries
    const recentDeliveries = weekDeliveries.filter((d: any) => d.status === 'delivered');
    const onTimeDeliveries = recentDeliveries.filter((d: any) => d.onTime === true);
    const onTimeDeliveryRate = recentDeliveries.length > 0 
      ? Math.round((onTimeDeliveries.length / recentDeliveries.length) * 100) 
      : 0;

    // Calculate average delivery time (mock for now)
    const averageDeliveryTime = 25 + Math.floor(Math.random() * 10);

    // Calculate bonuses based on tier and performance
    const driverProfile = await storage.getDriverProfile(driverId);
    const tierMultiplier = driverProfile?.tier === 'PREMIUM' ? 1.15 : driverProfile?.tier === 'ELITE' ? 1.25 : 1.0;
    const bonusEarnings = monthlyEarnings * (tierMultiplier - 1);

    // Calculate pending earnings (typically held for 24-48 hours)
    const pendingEarnings = todayEarnings * 0.3; // 30% pending for processing

    const earnings = {
      todayEarnings,
      weeklyEarnings,
      monthlyEarnings,
      totalEarnings,
      completedDeliveries: todayCompletedDeliveries,
      bonusEarnings,
      pendingEarnings,
      averageDeliveryTime,
      onTimeDeliveryRate
    };

    res.json(earnings);
  } catch (error) {
    console.error("Get driver earnings error:", error);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
});

// Get driver tier progress
router.get("/tier-progress", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const driverProfile = await storage.getDriverProfile(driverId);
    
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    const currentTier = driverProfile.tier || 'STANDARD';
    const totalDeliveries = driverProfile.totalDeliveries || 0;
    const totalEarnings = driverProfile.totalEarnings || 0;
    const rating = driverProfile.rating || 0;

    // Get recent deliveries to calculate on-time rate
    const recentDeliveries = await storage.getDriverDeliveriesForPeriod(
      driverId, 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date()
    );
    
    const onTimeDeliveries = recentDeliveries.filter((d: any) => d.onTime === true).length;
    const onTimeRate = recentDeliveries.length > 0 ? (onTimeDeliveries / recentDeliveries.length) * 100 : 0;

    // Define tier requirements and benefits
    const tierData = {
      STANDARD: {
        nextTier: 'PREMIUM',
        requirements: { deliveries: 50, rating: 4.5, earnings: 100000, onTimeRate: 85 },
        benefits: ["Standard delivery access", "Basic earnings structure", "Regular support"],
        nextTierBenefits: ["Premium delivery access", "15% higher rates", "Priority support", "Bonus eligibility"]
      },
      PREMIUM: {
        nextTier: 'ELITE',
        requirements: { deliveries: 150, rating: 4.7, earnings: 300000, onTimeRate: 90 },
        benefits: ["Premium delivery access", "15% higher rates", "Priority support", "Bonus eligibility"],
        nextTierBenefits: ["Elite delivery access", "25% higher rates", "24/7 priority support", "Exclusive bonuses", "VIP status"]
      },
      ELITE: {
        nextTier: null,
        requirements: {},
        benefits: ["Elite delivery access", "25% higher rates", "24/7 priority support", "Exclusive bonuses", "VIP status"],
        nextTierBenefits: []
      }
    };

    const currentTierData = tierData[currentTier as keyof typeof tierData];
    const nextTier = currentTierData.nextTier;
    
    let progress = 100; // Default for ELITE tier
    let requirementsNeeded = {};

    if (nextTier && currentTierData.requirements) {
      const req = currentTierData.requirements;
      const progressFactors = [];

      if (req.deliveries) {
        progressFactors.push(Math.min(totalDeliveries / req.deliveries, 1));
      }
      if (req.rating) {
        progressFactors.push(Math.min(rating / req.rating, 1));
      }
      if (req.earnings) {
        progressFactors.push(Math.min(totalEarnings / req.earnings, 1));
      }
      if (req.onTimeRate) {
        progressFactors.push(Math.min(onTimeRate / req.onTimeRate, 1));
      }

      progress = progressFactors.length > 0 
        ? Math.round(progressFactors.reduce((sum, factor) => sum + factor, 0) / progressFactors.length * 100)
        : 0;

      // Calculate remaining requirements
      requirementsNeeded = {
        ...(req.deliveries && totalDeliveries < req.deliveries && { 
          deliveries: req.deliveries - totalDeliveries 
        }),
        ...(req.rating && rating < req.rating && { 
          rating: req.rating 
        }),
        ...(req.earnings && totalEarnings < req.earnings && { 
          earnings: req.earnings - totalEliveries 
        }),
        ...(req.onTimeRate && onTimeRate < req.onTimeRate && { 
          onTimeRate: req.onTimeRate 
        })
      };
    }

    const tierProgress = {
      currentTier,
      nextTier,
      progress,
      requirementsNeeded,
      benefits: currentTierData.benefits,
      nextTierBenefits: currentTierData.nextTierBenefits
    };

    res.json(tierProgress);
  } catch (error) {
    console.error("Get tier progress error:", error);
    res.status(500).json({ message: "Failed to fetch tier progress" });
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

// Get driver delivery analytics
router.get("/analytics/deliveries", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { period = '30d' } = req.query;

    const analytics = await storage.getDriverDeliveryAnalytics(driverId, period as string);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error("Get delivery analytics error:", error);
    res.status(500).json({ message: "Failed to fetch delivery analytics" });
  }
});

// Get driver performance ratings
router.get("/performance/ratings", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { limit = 50 } = req.query;

    const ratings = await storage.getDriverRatings(driverId, parseInt(limit as string));

    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length 
      : 0;

    res.json({
      success: true,
      ratings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    });
  } catch (error) {
    console.error("Get performance ratings error:", error);
    res.status(500).json({ message: "Failed to fetch performance ratings" });
  }
});

// Update driver vehicle information
router.put("/vehicle", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { vehicleType, vehiclePlate, vehicleModel, vehicleColor } = req.body;

    const updatedProfile = await storage.updateDriverVehicle(driverId, {
      vehicleType,
      vehiclePlate,
      vehicleModel,
      vehicleColor
    });

    res.json({
      success: true,
      message: "Vehicle information updated successfully",
      profile: updatedProfile
    });
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({ message: "Failed to update vehicle information" });
  }
});

// Get nearby delivery opportunities
router.get("/opportunities", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { radius = 10 } = req.query;

    const driverProfile = await storage.getDriverProfile(driverId);
    if (!driverProfile || !driverProfile.currentLocation) {
      return res.status(400).json({ 
        message: "Driver location not available" 
      });
    }

    const opportunities = await storage.getNearbyDeliveryOpportunities(
      driverId,
      driverProfile.currentLocation,
      parseInt(radius as string)
    );

    res.json({
      success: true,
      opportunities
    });
  } catch (error) {
    console.error("Get opportunities error:", error);
    res.status(500).json({ message: "Failed to fetch delivery opportunities" });
  }
});

// Submit driver feedback
router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { orderId, rating, comment, category } = req.body;

    const feedback = await storage.createDriverFeedback({
      driverId,
      orderId,
      rating,
      comment,
      category,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

// Get driver schedule/availability
router.get("/schedule", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { date } = req.query;

    const schedule = await storage.getDriverSchedule(driverId, date as string);

    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

// Update driver schedule
router.put("/schedule", requireAuth, async (req, res) => {
  try {
    const driverId = req.session!.userId!;
    const { scheduleData } = req.body;

    const updatedSchedule = await storage.updateDriverSchedule(driverId, scheduleData);

    res.json({
      success: true,
      message: "Schedule updated successfully",
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

export default router;
