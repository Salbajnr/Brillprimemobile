import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

// Driver-Merchant Coordination schemas
const acceptDeliverySchema = z.object({
  deliveryId: z.string(),
  estimatedPickupTime: z.string().optional(),
  notes: z.string().optional()
});

const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string(),
  status: z.enum(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  notes: z.string().optional(),
  proof: z.object({
    type: z.enum(['PHOTO', 'SIGNATURE', 'QR_CODE']),
    data: z.string()
  }).optional()
});

const requestDeliverySchema = z.object({
  orderId: z.string(),
  customerId: z.number(),
  deliveryType: z.enum(['PACKAGE', 'FOOD', 'DOCUMENT', 'OTHER']),
  pickupAddress: z.string(),
  deliveryAddress: z.string(),
  estimatedDistance: z.number(),
  deliveryFee: z.number(),
  preferredDriverTier: z.enum(['STANDARD', 'PREMIUM']).optional(),
  specialInstructions: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  notes: z.string().optional()
});

const communicateWithDriverSchema = z.object({
  deliveryId: z.string(),
  message: z.string(),
  messageType: z.enum(['TEXT', 'LOCATION_UPDATE', 'ETA_UPDATE', 'ISSUE_REPORT']).default('TEXT')
});

export function registerDriverMerchantCoordinationRoutes(app: Express) {
  // Merchant requests delivery
  app.post("/api/coordination/request-delivery", requireAuth, async (req, res) => {
    try {
      const data = requestDeliverySchema.parse(req.body);
      const merchantId = req.session!.userId!;

      // Create delivery request
      const deliveryRequest = await storage.createDeliveryRequest({
        id: `DEL_${Date.now()}_${merchantId}`,
        merchantId,
        orderId: data.orderId,
        customerId: data.customerId,
        deliveryType: data.deliveryType,
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        estimatedDistance: data.estimatedDistance,
        deliveryFee: data.deliveryFee,
        preferredDriverTier: data.preferredDriverTier || 'STANDARD',
        specialInstructions: data.specialInstructions,
        urgency: data.urgency,
        status: 'PENDING',
        notes: data.notes
      });

      // Emit real-time notification to available drivers
      if (global.io) {
        const driverRoom = data.preferredDriverTier === 'PREMIUM' ? 'drivers_premium' : 'drivers_all';
        
        global.io.to(driverRoom).emit('new_delivery_request', {
          deliveryId: deliveryRequest.id,
          merchantId,
          deliveryType: data.deliveryType,
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          deliveryFee: data.deliveryFee,
          estimatedDistance: data.estimatedDistance,
          urgency: data.urgency,
          timestamp: Date.now()
        });

        // Notify specific order room
        global.io.to(`order_${data.orderId}`).emit('delivery_requested', {
          deliveryId: deliveryRequest.id,
          status: 'PENDING',
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Delivery request created successfully",
        deliveryRequest: {
          id: deliveryRequest.id,
          status: 'PENDING',
          estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          createdAt: deliveryRequest.createdAt
        }
      });

    } catch (error: any) {
      console.error('Delivery request error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create delivery request"
      });
    }
  });

  // Driver accepts delivery
  app.post("/api/coordination/accept-delivery", requireAuth, async (req, res) => {
    try {
      const data = acceptDeliverySchema.parse(req.body);
      const driverId = req.session!.userId!;

      // Check if driver profile exists and is available
      const driverProfile = await storage.getDriverProfile(driverId);
      if (!driverProfile || !driverProfile.isAvailable) {
        return res.status(400).json({
          success: false,
          message: "Driver not available for deliveries"
        });
      }

      // Accept the delivery job
      await storage.acceptDeliveryJob(data.deliveryId, driverId);

      // Update driver availability
      await storage.updateDriverLocation(driverId, {
        latitude: "0", // Driver should update location after accepting
        longitude: "0"
      });

      // Get delivery details for notifications
      const deliveryDetails = await storage.getOrderTracking(data.deliveryId);

      // Emit real-time notifications
      if (global.io) {
        // Notify merchant
        if (deliveryDetails?.sellerId) {
          global.io.to(`user_${deliveryDetails.sellerId}`).emit('delivery_accepted', {
            deliveryId: data.deliveryId,
            driverId,
            driverName: driverProfile.userId, // You might want to get actual driver name
            estimatedPickupTime: data.estimatedPickupTime || new Date(Date.now() + 30 * 60 * 1000),
            timestamp: Date.now()
          });
        }

        // Notify customer
        if (deliveryDetails?.buyerId) {
          global.io.to(`user_${deliveryDetails.buyerId}`).emit('delivery_assigned', {
            deliveryId: data.deliveryId,
            driverId,
            status: 'ACCEPTED',
            timestamp: Date.now()
          });
        }

        // Update order room
        global.io.to(`order_${data.deliveryId}`).emit('delivery_status_update', {
          status: 'ACCEPTED',
          driverId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Delivery accepted successfully",
        deliveryId: data.deliveryId,
        estimatedPickupTime: data.estimatedPickupTime
      });

    } catch (error: any) {
      console.error('Accept delivery error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to accept delivery"
      });
    }
  });

  // Update delivery status (Driver)
  app.put("/api/coordination/delivery-status", requireAuth, async (req, res) => {
    try {
      const data = updateDeliveryStatusSchema.parse(req.body);
      const driverId = req.session!.userId!;

      // Update delivery status
      await storage.updateOrderTracking(data.deliveryId, data.status.toLowerCase(), data.location);

      // Prepare status update data
      const statusUpdate = {
        deliveryId: data.deliveryId,
        status: data.status,
        location: data.location,
        notes: data.notes,
        proof: data.proof,
        driverId,
        timestamp: Date.now()
      };

      // Get delivery details for notifications
      const deliveryDetails = await storage.getOrderTracking(data.deliveryId);

      // Emit real-time notifications
      if (global.io) {
        // Notify merchant
        if (deliveryDetails?.sellerId) {
          global.io.to(`user_${deliveryDetails.sellerId}`).emit('delivery_status_update', statusUpdate);
        }

        // Notify customer
        if (deliveryDetails?.buyerId) {
          global.io.to(`user_${deliveryDetails.buyerId}`).emit('delivery_status_update', statusUpdate);
        }

        // Update order room
        global.io.to(`order_${data.deliveryId}`).emit('delivery_status_update', statusUpdate);

        // Update delivery room
        global.io.to(`delivery_${data.deliveryId}`).emit('status_update', statusUpdate);
      }

      // Handle special status updates
      if (data.status === 'DELIVERED') {
        // Mark driver as available again
        // await storage.updateDriverAvailability(driverId, true);
        
        // Process delivery completion
        // This might include payment processing, ratings, etc.
      }

      res.json({
        success: true,
        message: `Delivery status updated to ${data.status}`,
        statusUpdate
      });

    } catch (error: any) {
      console.error('Delivery status update error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update delivery status"
      });
    }
  });

  // Communication between merchant and driver
  app.post("/api/coordination/communicate", requireAuth, async (req, res) => {
    try {
      const data = communicateWithDriverSchema.parse(req.body);
      const senderId = req.session!.userId!;

      // Get delivery details to determine recipient
      const deliveryDetails = await storage.getOrderTracking(data.deliveryId);
      if (!deliveryDetails) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found"
        });
      }

      // Determine recipient (merchant or driver)
      const recipientId = deliveryDetails.sellerId === senderId ? 
        deliveryDetails.driverId : deliveryDetails.sellerId;

      if (!recipientId) {
        return res.status(400).json({
          success: false,
          message: "Recipient not found"
        });
      }

      // Create conversation if it doesn't exist
      let conversation;
      try {
        conversation = await storage.createConversation({
          id: `DELIVERY_${data.deliveryId}`,
          customerId: deliveryDetails.sellerId, // Merchant
          vendorId: recipientId, // Driver or vice versa
          conversationType: 'DELIVERY',
          status: 'ACTIVE'
        });
      } catch (error) {
        // Conversation might already exist
      }

      // Send message
      const message = await storage.sendMessage({
        id: `MSG_${Date.now()}_${senderId}`,
        conversationId: `DELIVERY_${data.deliveryId}`,
        senderId,
        content: data.message,
        messageType: data.messageType === 'TEXT' ? 'TEXT' : 'ORDER_UPDATE'
      });

      // Emit real-time message
      if (global.io) {
        global.io.to(`user_${recipientId}`).emit('delivery_message', {
          deliveryId: data.deliveryId,
          senderId,
          message: data.message,
          messageType: data.messageType,
          timestamp: Date.now()
        });

        // Update delivery room
        global.io.to(`delivery_${data.deliveryId}`).emit('new_message', {
          senderId,
          message: data.message,
          messageType: data.messageType,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Message sent successfully",
        messageId: message.id
      });

    } catch (error: any) {
      console.error('Communication error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to send message"
      });
    }
  });

  // Get available drivers (Merchant view)
  app.get("/api/coordination/available-drivers", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, radius = 10000, driverTier } = req.query;

      // Get nearby available drivers
      let nearbyDrivers = [];
      if (latitude && longitude) {
        const nearbyUsers = await storage.getNearbyUsers(
          parseFloat(latitude as string),
          parseFloat(longitude as string),
          parseFloat(radius as string),
          'DRIVER'
        );
        nearbyDrivers = nearbyUsers;
      }

      // Filter by driver tier if specified
      // This would need additional implementation in storage layer

      res.json({
        success: true,
        drivers: nearbyDrivers.map(driver => ({
          id: driver.userId,
          location: {
            latitude: driver.latitude,
            longitude: driver.longitude
          },
          isAvailable: true,
          // Add more driver details as needed
        }))
      });

    } catch (error: any) {
      console.error('Available drivers error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get available drivers"
      });
    }
  });

  // Get delivery assignments (Driver view)
  app.get("/api/coordination/my-deliveries", requireAuth, async (req, res) => {
    try {
      const driverId = req.session!.userId!;
      const { status } = req.query;

      const deliveries = await storage.getDriverOrders(driverId, status as string);

      // Enrich with tracking data
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (delivery) => {
          const trackingData = await storage.getOrderTracking(delivery.id);
          return {
            ...delivery,
            tracking: trackingData
          };
        })
      );

      res.json({
        success: true,
        deliveries: enrichedDeliveries
      });

    } catch (error: any) {
      console.error('Driver deliveries error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get deliveries"
      });
    }
  });

  // Get delivery requests (Merchant view)
  app.get("/api/coordination/my-delivery-requests", requireAuth, async (req, res) => {
    try {
      const merchantId = req.session!.userId!;

      // Get merchant's delivery requests
      // This would need additional implementation in storage layer
      const deliveryRequests = []; // Placeholder

      res.json({
        success: true,
        requests: deliveryRequests
      });

    } catch (error: any) {
      console.error('Merchant delivery requests error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get delivery requests"
      });
    }
  });

  // Emergency contact (Driver or Merchant)
  app.post("/api/coordination/emergency", requireAuth, async (req, res) => {
    try {
      const { deliveryId, emergencyType, description, location } = req.body;
      const userId = req.session!.userId!;

      const emergencyReport = {
        id: `EMERGENCY_${Date.now()}_${userId}`,
        deliveryId,
        reportedBy: userId,
        emergencyType,
        description,
        location,
        timestamp: Date.now(),
        status: 'ACTIVE'
      };

      // Emit immediate notifications to all relevant parties
      if (global.io) {
        // Notify admin
        global.io.to('admin_emergency').emit('emergency_report', emergencyReport);

        // Notify other party in delivery
        const deliveryDetails = await storage.getOrderTracking(deliveryId);
        if (deliveryDetails) {
          const otherParties = [deliveryDetails.sellerId, deliveryDetails.buyerId, deliveryDetails.driverId]
            .filter(id => id && id !== userId);

          otherParties.forEach(partyId => {
            global.io.to(`user_${partyId}`).emit('delivery_emergency', emergencyReport);
          });
        }

        // Update delivery room
        global.io.to(`delivery_${deliveryId}`).emit('emergency_alert', emergencyReport);
      }

      res.json({
        success: true,
        message: "Emergency report submitted",
        emergencyId: emergencyReport.id
      });

    } catch (error: any) {
      console.error('Emergency report error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to submit emergency report"
      });
    }
  });
}