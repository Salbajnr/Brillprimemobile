import type { Express } from "express";
import { storage } from "../storage";
import { insertFuelOrderSchema } from "../../shared/schema";
import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { fuelOrders, users, driverProfiles } from '../../shared/schema';
import { eq, and, desc, isNull, ne } from 'drizzle-orm';
import { orderBroadcastingService } from '../services/order-broadcasting';

import { validateSchema, sanitizeInput, createRateLimit } from '../middleware/validation';

const createFuelOrderSchema = z.object({
  stationId: z.string(),
  fuelType: z.enum(['PMS', 'AGO', 'DPK']),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalAmount: z.number().positive(),
  deliveryAddress: z.string().min(1),
  deliveryLatitude: z.number(),
  deliveryLongitude: z.number(),
  scheduledDeliveryTime: z.string().optional(),
  notes: z.string().optional()
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  driverId: z.number().optional(),
  estimatedDeliveryTime: z.string().optional(),
  notes: z.string().optional()
});

export function registerFuelOrderRoutes(app: Express) {
  // Get fuel stations near location
  app.get("/api/fuel/stations", async (req, res) => {
    try {
      const { lat, lng, radius = 10000 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const stations = await storage.getNearbyFuelStations(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );

      res.json({ success: true, stations });
    } catch (error) {
      console.error("Get fuel stations error:", error);
      res.status(500).json({ message: "Failed to fetch fuel stations" });
    }
  });

  // Create fuel order
  app.post("/api/fuel-orders", 
    createRateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 orders per 15 minutes
    sanitizeInput(),
    validateSchema(createFuelOrderSchema),
    async (req: any, res: any) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const validatedData = req.body;

      const [newOrder] = await db.insert(fuelOrders).values({
        ...validatedData,
        customerId: userId,
        status: 'PENDING'
      }).returning();

      // Broadcast to available drivers
      if (global.io) {
        global.io.to('drivers').emit('new_fuel_order', {
          type: 'NEW_FUEL_ORDER',
          order: newOrder,
          status: 'PENDING',
          timestamp: Date.now()
        });
      }

      res.json({ success: true, order: newOrder });
    } catch (error) {
      console.error('Error creating fuel order:', error);
      res.status(500).json({ success: false, error: 'Failed to create fuel order' });
    }
  });

  

  // Get fuel orders for user
  app.get("/api/fuel/orders", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.user?.role;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      let orders;

      if (userRole === 'CONSUMER') {
        orders = await db
          .select({
            id: fuelOrders.id,
            stationId: fuelOrders.stationId,
            fuelType: fuelOrders.fuelType,
            quantity: fuelOrders.quantity,
            unitPrice: fuelOrders.unitPrice,
            totalAmount: fuelOrders.totalAmount,
            deliveryAddress: fuelOrders.deliveryAddress,
            status: fuelOrders.status,
            createdAt: fuelOrders.createdAt,
            estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
            notes: fuelOrders.notes,
            driverName: users.fullName,
            driverPhone: users.phone
          })
          .from(fuelOrders)
          .leftJoin(users, eq(fuelOrders.driverId, users.id))
          .where(eq(fuelOrders.customerId, userId))
          .orderBy(desc(fuelOrders.createdAt));
      } else if (userRole === 'DRIVER') {
        // Show assigned orders and available orders
        const assignedOrders = await db
          .select({
            id: fuelOrders.id,
            stationId: fuelOrders.stationId,
            fuelType: fuelOrders.fuelType,
            quantity: fuelOrders.quantity,
            unitPrice: fuelOrders.unitPrice,
            totalAmount: fuelOrders.totalAmount,
            deliveryAddress: fuelOrders.deliveryAddress,
            status: fuelOrders.status,
            createdAt: fuelOrders.createdAt,
            estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
            notes: fuelOrders.notes,
            customerName: users.fullName,
            customerPhone: users.phone
          })
          .from(fuelOrders)
          .leftJoin(users, eq(fuelOrders.customerId, users.id))
          .where(eq(fuelOrders.driverId, userId))
          .orderBy(desc(fuelOrders.createdAt));

        const availableOrders = await db
          .select({
            id: fuelOrders.id,
            stationId: fuelOrders.stationId,
            fuelType: fuelOrders.fuelType,
            quantity: fuelOrders.quantity,
            unitPrice: fuelOrders.unitPrice,
            totalAmount: fuelOrders.totalAmount,
            deliveryAddress: fuelOrders.deliveryAddress,
            status: fuelOrders.status,
            createdAt: fuelOrders.createdAt,
            estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
            notes: fuelOrders.notes,
            customerName: users.fullName,
            customerPhone: users.phone
          })
          .from(fuelOrders)
          .leftJoin(users, eq(fuelOrders.customerId, users.id))
          .where(and(
            isNull(fuelOrders.driverId),
            eq(fuelOrders.status, 'PENDING')
          ))
          .orderBy(desc(fuelOrders.createdAt));

        orders = { assigned: assignedOrders, available: availableOrders };
      } else {
        orders = await db
          .select()
          .from(fuelOrders)
          .orderBy(desc(fuelOrders.createdAt));
      }

      res.json({ success: true, orders });
    } catch (error) {
      console.error('Error fetching fuel orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch fuel orders' });
    }
  });

  // Update fuel order status (for drivers/merchants)
  app.put("/api/fuel/orders/:orderId/status", async (req: any, res: any) => {
    try {
      const { orderId } = req.params;
      const userId = req.session?.userId;
      const userRole = req.session?.user?.role;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = updateOrderStatusSchema.parse(req.body);

      // Check permissions
      const order = await db
        .select()
        .from(fuelOrders)
        .where(eq(fuelOrders.id, orderId))
        .limit(1);

      if (!order.length) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const currentOrder = order[0];

      // Only driver assigned to order or customer can update
      if (userRole === 'DRIVER' && currentOrder.driverId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this order' });
      }

      if (userRole === 'CONSUMER' && currentOrder.customerId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this order' });
      }

      const updateData: any = {
        status: validatedData.status,
        updatedAt: new Date()
      };

      if (validatedData.status === 'PICKED_UP') {
        updateData.pickedUpAt = new Date();
      } else if (validatedData.status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }

      if (validatedData.estimatedDeliveryTime) {
        updateData.estimatedDeliveryTime = validatedData.estimatedDeliveryTime;
      }

      if (validatedData.notes) {
        updateData.notes = validatedData.notes;
      }

      const [updatedOrder] = await db
        .update(fuelOrders)
        .set(updateData)
        .where(eq(fuelOrders.id, orderId))
        .returning();

      // Broadcast update to all parties
      orderBroadcastingService.broadcastOrderUpdate({
        orderId: orderId,
        buyerId: currentOrder.customerId,
        sellerId: null,
        driverId: currentOrder.driverId,
        status: validatedData.status,
        location: {
          address: currentOrder.deliveryAddress,
          latitude: parseFloat(currentOrder.deliveryLatitude || '0'),
          longitude: parseFloat(currentOrder.deliveryLongitude || '0')
        }
      });

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error('Error updating fuel order status:', error);
      res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  });

  // Helper function for status messages
  function getFuelOrderStatusMessage(status: string, role: string): string {
    const messages = {
      customer: {
        'PENDING': 'Your fuel order has been placed and is awaiting confirmation.',
        'CONFIRMED': 'Your fuel order has been confirmed and is being prepared.',
        'READY_FOR_PICKUP': 'Your fuel is ready and waiting for driver pickup.',
        'PICKED_UP': 'Your fuel has been picked up and is on the way to you.',
        'IN_TRANSIT': 'Your fuel delivery is in progress.',
        'DELIVERED': 'Your fuel has been delivered successfully!',
        'CANCELLED': 'Your fuel order has been cancelled.'
      },
      driver: {
        'CONFIRMED': 'New fuel delivery opportunity available.',
        'ASSIGNED': 'You have been assigned a fuel delivery.',
        'READY_FOR_PICKUP': 'Fuel is ready for pickup at the station.',
        'PICKED_UP': 'Fuel picked up. Please proceed to delivery location.',
        'IN_TRANSIT': 'Delivery in progress.',
        'DELIVERED': 'Delivery completed successfully.',
        'CANCELLED': 'Delivery has been cancelled.'
      },
      merchant: {
        'PENDING': 'New fuel order received. Please prepare the fuel.',
        'CONFIRMED': 'Fuel order confirmed. Please prepare for pickup.',
        'READY_FOR_PICKUP': 'Fuel is ready. Awaiting driver pickup.',
        'PICKED_UP': 'Fuel has been picked up by driver.',
        'DELIVERED': 'Fuel order completed successfully.',
        'CANCELLED': 'Fuel order has been cancelled.'
      }
    };

    return messages[role as keyof typeof messages]?.[status as keyof any] || `Order status updated to ${status}`;
  }

  function calculateDeliveryDistance(order: any): string {
    // Simplified distance calculation - in production use proper geocoding
    return '2.5 km';
  }

  // Get available fuel orders for drivers
  app.get("/api/fuel/orders/available", async (req: any, res: any) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "DRIVER") {
        return res.status(403).json({ message: "Only drivers can access this endpoint" });
      }

      const orders = await storage.getAvailableFuelOrders();
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get available fuel orders error:", error);
      res.status(500).json({ message: "Failed to fetch available orders" });
    }
  });

  // Get specific fuel station by ID
  app.get("/api/fuel/stations/:stationId", async (req: any, res: any) => {
    try {
      const { stationId } = req.params;

      const station = await storage.getFuelStationById(stationId);

      if (!station) {
        return res.status(404).json({ message: "Fuel station not found" });
      }

      res.json({ success: true, station });
    } catch (error) {
      console.error("Get fuel station error:", error);
      res.status(500).json({ message: "Failed to fetch fuel station" });
    }
  });

  // Get specific fuel order by ID
  app.get("/api/fuel/orders/:orderId", async (req: any, res: any) => {
    try {
      const { orderId } = req.params;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const order = await db
        .select({
          id: fuelOrders.id,
          stationId: fuelOrders.stationId,
          fuelType: fuelOrders.fuelType,
          quantity: fuelOrders.quantity,
          unitPrice: fuelOrders.unitPrice,
          totalAmount: fuelOrders.totalAmount,
          deliveryAddress: fuelOrders.deliveryAddress,
          deliveryLatitude: fuelOrders.deliveryLatitude,
          deliveryLongitude: fuelOrders.deliveryLongitude,
          status: fuelOrders.status,
          createdAt: fuelOrders.createdAt,
          acceptedAt: fuelOrders.acceptedAt,
          pickedUpAt: fuelOrders.pickedUpAt,
          deliveredAt: fuelOrders.deliveredAt,
          estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
          notes: fuelOrders.notes,
          customerId: fuelOrders.customerId,
          driverId: fuelOrders.driverId,
          customerName: users.fullName,
          customerPhone: users.phone
        })
        .from(fuelOrders)
        .leftJoin(users, eq(fuelOrders.customerId, users.id))
        .where(eq(fuelOrders.id, orderId))
        .limit(1);

      if (!order.length) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const orderData = order[0];

      // Check if user has access to this order
      if (orderData.customerId !== userId && orderData.driverId !== userId && req.session?.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Get driver details if assigned
      if (orderData.driverId) {
        const driver = await db
          .select({
            name: users.fullName,
            phone: users.phone,
            profilePicture: users.profilePicture
          })
          .from(users)
          .where(eq(users.id, orderData.driverId))
          .limit(1);

        if (driver.length) {
          (orderData as any).driverName = driver[0].name;
          (orderData as any).driverPhone = driver[0].phone;
          (orderData as any).driverProfilePicture = driver[0].profilePicture;
        }
      }

      res.json({ success: true, order: orderData });
    } catch (error) {
      console.error('Error fetching fuel order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  });

  // Get fuel orders for merchant
  app.get("/api/fuel/orders/merchant", async (req: any, res: any) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "MERCHANT") {
        return res.status(403).json({ message: "Only merchants can access this endpoint" });
      }

      const orders = await storage.getMerchantFuelOrders(req.session.userId);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get merchant fuel orders error:", error);
      res.status(500).json({ message: "Failed to fetch merchant orders" });
    }
  });

   // Accept fuel order for driver
   app.post("/api/fuel/orders/:orderId/accept", async (req: any, res: any) => {
    try {
      const { orderId } = req.params;
      const driverId = req.session?.userId;

      if (!driverId || req.session?.user?.role !== 'DRIVER') {
        return res.status(403).json({ success: false, error: 'Only drivers can accept orders' });
      }

      // Check if driver is available
      const driverProfile = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, driverId))
        .limit(1);

      if (!driverProfile.length || !driverProfile[0].isAvailable) {
        return res.status(400).json({ success: false, error: 'Driver not available' });
      }

      const [updatedOrder] = await db
        .update(fuelOrders)
        .set({
          driverId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(fuelOrders.id, orderId),
          eq(fuelOrders.status, 'PENDING'),
          isNull(fuelOrders.driverId)
        ))
        .returning();

      if (!updatedOrder) {
        return res.status(400).json({ success: false, error: 'Order not available or already accepted' });
      }

      // Broadcast update to customer
      if (global.io) {
        global.io.to(`user_${updatedOrder.customerId}`).emit('order_update', {
          type: 'ORDER_ACCEPTED',
          order: updatedOrder,
          status: 'ACCEPTED',
          driverId,
          timestamp: Date.now()
        });
      }

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error('Error accepting fuel order:', error);
      res.status(500).json({ success: false, error: 'Failed to accept order' });
    }
  });

  // Request delivery for order
  app.post("/api/delivery/request", async (req: any, res: any) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId } = req.body;
      const order = await storage.getFuelOrderById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.sellerId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Broadcast delivery request to available drivers
      if (global.io) {
        global.io.to('drivers').emit('delivery_request', {
          orderId: order.id,
          fuelType: order.fuelType,
          quantity: order.quantity,
          pickupAddress: order.stationAddress,
          deliveryAddress: order.deliveryAddress,
          totalAmount: order.totalAmount,
          timestamp: Date.now()
        });
      }

      res.json({ 
        success: true,
        message: "Delivery request sent to available drivers" 
      });
    } catch (error) {
      console.error("Request delivery error:", error);
      res.status(500).json({ message: "Failed to request delivery" });
    }
  });

  // Get driver location
  app.get("/api/tracking/driver/:driverId/location", async (req: any, res: any) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { driverId } = req.params;
      const driverProfile = await storage.getDriverProfile(parseInt(driverId));

      if (!driverProfile) {
        return res.status(404).json({ message: "Driver not found" });
      }

      res.json({ 
        success: true,
        location: driverProfile.currentLocation 
      });
    } catch (error) {
      console.error("Get driver location error:", error);
      res.status(500).json({ message: "Failed to fetch driver location" });
    }
  });

  // Real-time driver location updates for fuel delivery
  app.post("/api/fuel/delivery/location-update", async (req: any, res: any) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId, latitude, longitude, heading, speed } = req.body;
      const driverId = req.session.userId;

      // Update driver location in database
      await storage.updateDriverLocation(driverId, {
        latitude: latitude.toString(),
        longitude: longitude.toString()
      });

      // Calculate ETA to delivery location
      const order = await storage.getFuelOrderById(orderId);
      if (order) {
        const distance = calculateDistance(
          latitude, longitude,
          parseFloat(order.deliveryLatitude),
          parseFloat(order.deliveryLongitude)
        );
        const etaMinutes = Math.round((distance / 25) * 60); // 25 km/h average speed

        // Real-time location broadcast
        if (global.io) {
          const locationUpdate = {
            orderId,
            driverId,
            location: { latitude, longitude },
            heading,
            speed,
            eta: `${etaMinutes} minutes`,
            distance: `${distance.toFixed(1)} km`,
            timestamp: Date.now()
          };

          // Notify customer about driver location
          global.io.to(`user_${order.customerId}`).emit('driver_location_update', locationUpdate);

          // Broadcast to order tracking room
          global.io.to(`order_${orderId}`).emit('real_time_tracking', locationUpdate);

          // Notify admin monitoring
          global.io.to('admin_monitoring').emit('driver_location_update', {
            ...locationUpdate,
            driverName: 'Driver Name', // Get from database
            customerAddress: order.deliveryAddress
          });
        }
      }

      res.json({ 
        success: true,
        message: "Location updated successfully"
      });
    } catch (error) {
      console.error("Driver location update error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Helper function to calculate distance
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
export async function acceptFuelOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ success: false, error: 'Only drivers can accept orders' });
    }

    // Check if driver is available
    const driverProfile = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);

    if (!driverProfile.length || !driverProfile[0].isAvailable) {
      return res.status(400).json({ success: false, error: 'Driver not available' });
    }

    const [updatedOrder] = await db
      .update(fuelOrders)
      .set({
        driverId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(fuelOrders.id, parseInt(orderId)),
        eq(fuelOrders.status, 'PENDING'),
        isNull(fuelOrders.driverId)
      ))
      .returning();

    if (!updatedOrder) {
      return res.status(400).json({ success: false, error: 'Order not available or already accepted' });
    }

    // Broadcast update to customer
    if (global.io) {
      global.io.to(`user_${updatedOrder.customerId}`).emit('order_update', {
        type: 'ORDER_ACCEPTED',
        order: updatedOrder,
        status: 'ACCEPTED',
        driverId,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error accepting fuel order:', error);
    res.status(500).json({ success: false, error: 'Failed to accept order' });
  }
}