
import { Router } from "express";
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users, orders, driverProfiles, transactions, wallets, ratings } from '../../shared/schema';
import { eq, desc, and, gte, count, sum, sql, isNull } from 'drizzle-orm';

const router = Router();

// Validation schemas
const updateDriverStatusSchema = z.object({
  isOnline: z.boolean(),
  isAvailable: z.boolean().optional(),
  currentLocation: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional()
});

const acceptDeliverySchema = z.object({
  orderId: z.string(),
  estimatedDeliveryTime: z.number().optional()
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  notes: z.string().optional()
});

// Get driver dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's deliveries and earnings
    const todayStats = await db
      .select({
        deliveries: count(),
        earnings: sum(sql`cast(${orders.driverEarnings} as decimal)`)
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, driverId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, today)
      ));

    // Total deliveries and earnings
    const totalStats = await db
      .select({
        totalDeliveries: count(),
        totalEarnings: sum(sql`cast(${orders.driverEarnings} as decimal)`),
        completedDeliveries: count(sql`case when ${orders.status} = 'DELIVERED' then 1 end`),
        allDeliveries: count()
      })
      .from(orders)
      .where(eq(orders.driverId, driverId));

    // Active orders
    const activeOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryAddress: orders.deliveryAddress,
        customerName: users.fullName,
        customerPhone: users.phone,
        createdAt: orders.createdAt
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .where(and(
        eq(orders.driverId, driverId),
        sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED')`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // Calculate completion rate
    const completionRate = totalStats[0]?.allDeliveries > 0 
      ? (Number(totalStats[0]?.completedDeliveries) / Number(totalStats[0]?.allDeliveries)) * 100 
      : 0;

    // Get driver profile
    const [driverProfile] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);

    const metrics = {
      todayDeliveries: Number(todayStats[0]?.deliveries || 0),
      todayEarnings: Number(todayStats[0]?.earnings || 0),
      totalDeliveries: Number(totalStats[0]?.totalDeliveries || 0),
      totalEarnings: Number(totalStats[0]?.totalEarnings || 0),
      completionRate: Math.round(completionRate),
      activeOrders,
      driverStatus: {
        isOnline: driverProfile?.isOnline || false,
        isAvailable: driverProfile?.isAvailable || false,
        currentLocation: driverProfile?.currentLocation || null
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error("Get driver dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard metrics" });
  }
});

// Get driver profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const [driverProfile] = await db
      .select({
        id: driverProfiles.id,
        userId: driverProfiles.userId,
        vehicleType: driverProfiles.vehicleType,
        vehiclePlate: driverProfiles.vehiclePlate,
        vehicleModel: driverProfiles.vehicleModel,
        isAvailable: driverProfiles.isAvailable,
        isOnline: driverProfiles.isOnline,
        currentLocation: driverProfiles.currentLocation,
        rating: driverProfiles.rating,
        totalDeliveries: driverProfiles.totalDeliveries,
        totalEarnings: driverProfiles.totalEarnings,
        verificationStatus: driverProfiles.verificationStatus,
        createdAt: driverProfiles.createdAt,
        // User details
        fullName: users.fullName,
        email: users.email,
        phone: users.phone
      })
      .from(driverProfiles)
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);

    if (!driverProfile) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    res.json({
      success: true,
      data: driverProfile
    });
  } catch (error) {
    console.error("Get driver profile error:", error);
    res.status(500).json({ error: "Failed to fetch driver profile" });
  }
});

// Update driver status
router.put("/status", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const validatedData = updateDriverStatusSchema.parse(req.body);

    const updateData: any = {
      isOnline: validatedData.isOnline,
      updatedAt: new Date()
    };

    if (validatedData.isAvailable !== undefined) {
      updateData.isAvailable = validatedData.isAvailable;
    }

    if (validatedData.currentLocation) {
      updateData.currentLocation = JSON.stringify(validatedData.currentLocation);
    }

    const [updatedProfile] = await db
      .update(driverProfiles)
      .set(updateData)
      .where(eq(driverProfiles.userId, driverId))
      .returning();

    // Real-time status update
    if (global.io) {
      global.io.to(`user_${driverId}`).emit('status_updated', {
        isOnline: validatedData.isOnline,
        isAvailable: validatedData.isAvailable,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      data: updatedProfile
    });
  } catch (error: any) {
    console.error("Update driver status error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Get available delivery requests
router.get("/delivery-requests", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    // Get available orders (no driver assigned yet)
    const availableOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        totalAmount: orders.totalAmount,
        deliveryAddress: orders.deliveryAddress,
        customerName: users.fullName,
        customerPhone: users.phone,
        merchantName: sql`merchant.full_name`,
        createdAt: orders.createdAt,
        estimatedDistance: sql`'2.5 km'`, // Mock distance - should be calculated
        estimatedTime: sql`'25 minutes'` // Mock time - should be calculated
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(sql`users as merchant`, sql`orders.merchant_id = merchant.id`)
      .where(and(
        isNull(orders.driverId),
        sql`${orders.status} IN ('PENDING', 'CONFIRMED')`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    res.json({
      success: true,
      data: availableOrders
    });
  } catch (error) {
    console.error("Get delivery requests error:", error);
    res.status(500).json({ error: "Failed to fetch delivery requests" });
  }
});

// Accept delivery request
router.post("/accept-delivery", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const validatedData = acceptDeliverySchema.parse(req.body);

    // Check if driver is available
    const [driverProfile] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);

    if (!driverProfile || !driverProfile.isAvailable || !driverProfile.isOnline) {
      return res.status(400).json({ error: "Driver not available" });
    }

    // Check if order is still available
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, validatedData.orderId),
        isNull(orders.driverId),
        sql`${orders.status} IN ('PENDING', 'CONFIRMED')`
      ))
      .limit(1);

    if (!order) {
      return res.status(400).json({ error: "Order not available" });
    }

    // Accept the order
    const [acceptedOrder] = await db
      .update(orders)
      .set({
        driverId,
        status: 'ACCEPTED',
        driverEarnings: (parseFloat(order.totalAmount) * 0.15).toString(), // 15% commission
        updatedAt: new Date()
      })
      .where(eq(orders.id, validatedData.orderId))
      .returning();

    // Update driver availability
    await db
      .update(driverProfiles)
      .set({
        isAvailable: false,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, driverId));

    // Real-time notifications
    if (global.io) {
      // Notify customer
      global.io.to(`user_${order.customerId}`).emit('delivery_assigned', {
        orderId: validatedData.orderId,
        driverId,
        status: 'ACCEPTED',
        timestamp: Date.now()
      });

      // Notify merchant
      if (order.merchantId) {
        global.io.to(`user_${order.merchantId}`).emit('delivery_accepted', {
          orderId: validatedData.orderId,
          driverId,
          timestamp: Date.now()
        });
      }
    }

    res.json({ 
      success: true, 
      data: acceptedOrder 
    });
  } catch (error: any) {
    console.error("Accept delivery error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to accept delivery" });
  }
});

// Update delivery status
router.put("/delivery/:orderId/status", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const validatedData = updateDeliveryStatusSchema.parse(req.body);

    // Verify order ownership
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.driverId, driverId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    // Handle status-specific updates
    if (validatedData.status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      
      // Update driver availability and earnings
      await Promise.all([
        db.update(driverProfiles)
          .set({
            isAvailable: true,
            totalDeliveries: sql`${driverProfiles.totalDeliveries} + 1`,
            totalEarnings: sql`${driverProfiles.totalEarnings} + ${order.driverEarnings}`,
            updatedAt: new Date()
          })
          .where(eq(driverProfiles.userId, driverId)),
        
        // Record earnings transaction
        db.insert(transactions).values({
          userId: driverId,
          orderId: order.id,
          amount: order.driverEarnings,
          type: 'DELIVERY_EARNINGS',
          status: 'COMPLETED',
          paymentMethod: 'wallet',
          paymentStatus: 'COMPLETED',
          transactionRef: `earn_${Date.now()}_${driverId}`,
          description: `Delivery earnings for order ${order.orderNumber}`,
          createdAt: new Date()
        })
      ]);
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Real-time updates
    if (global.io) {
      const statusUpdate = {
        orderId,
        status: validatedData.status,
        location: validatedData.location,
        notes: validatedData.notes,
        timestamp: Date.now()
      };

      // Notify customer
      global.io.to(`user_${order.customerId}`).emit('delivery_status_update', statusUpdate);

      // Notify merchant
      if (order.merchantId) {
        global.io.to(`user_${order.merchantId}`).emit('delivery_status_update', statusUpdate);
      }
    }

    res.json({ 
      success: true, 
      data: updatedOrder 
    });
  } catch (error: any) {
    console.error("Update delivery status error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

// Get driver earnings
router.get("/earnings", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const { period = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get earnings for the period
    const [periodEarnings] = await db
      .select({
        totalEarnings: sum(sql`cast(${orders.driverEarnings} as decimal)`),
        totalDeliveries: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, driverId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, startDate)
      ));

    // Get all-time earnings
    const [totalEarnings] = await db
      .select({
        totalEarnings: sum(sql`cast(${orders.driverEarnings} as decimal)`),
        totalDeliveries: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, driverId),
        eq(orders.status, 'DELIVERED')
      ));

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayEarnings] = await db
      .select({
        earnings: sum(sql`cast(${orders.driverEarnings} as decimal)`),
        deliveries: count()
      })
      .from(orders)
      .where(and(
        eq(orders.driverId, driverId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, today)
      ));

    // Get wallet balance
    const [wallet] = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, driverId))
      .limit(1);

    const earnings = {
      todayEarnings: Number(todayEarnings?.earnings || 0),
      todayDeliveries: Number(todayEarnings?.deliveries || 0),
      periodEarnings: Number(periodEarnings?.totalEarnings || 0),
      periodDeliveries: Number(periodEarnings?.totalDeliveries || 0),
      totalEarnings: Number(totalEarnings?.totalEarnings || 0),
      totalDeliveries: Number(totalEarnings?.totalDeliveries || 0),
      availableBalance: Number(wallet?.balance || 0),
      averagePerDelivery: Number(totalEarnings?.totalDeliveries) > 0 
        ? Number(totalEarnings?.totalEarnings) / Number(totalEarnings?.totalDeliveries) 
        : 0
    };

    res.json({
      success: true,
      data: earnings
    });
  } catch (error) {
    console.error("Get driver earnings error:", error);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

// Get driver orders/deliveries
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [eq(orders.driverId, driverId)];

    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as string));
    }

    const driverOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        driverEarnings: orders.driverEarnings,
        deliveryAddress: orders.deliveryAddress,
        orderType: orders.orderType,
        createdAt: orders.createdAt,
        deliveredAt: orders.deliveredAt,
        customerName: users.fullName,
        customerPhone: users.phone,
        merchantName: sql`merchant.full_name`
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(sql`users as merchant`, sql`orders.merchant_id = merchant.id`)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: driverOrders
    });
  } catch (error) {
    console.error("Get driver orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get driver performance metrics
router.get("/performance", requireAuth, async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId || req.user?.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    // Get driver ratings
    const [avgRating] = await db
      .select({ average: sql`avg(${ratings.rating})` })
      .from(ratings)
      .where(eq(ratings.driverId, driverId));

    // Get completion rate
    const [completionStats] = await db
      .select({
        total: count(),
        completed: count(sql`case when ${orders.status} = 'DELIVERED' then 1 end`),
        cancelled: count(sql`case when ${orders.status} = 'CANCELLED' then 1 end`)
      })
      .from(orders)
      .where(eq(orders.driverId, driverId));

    const completionRate = Number(completionStats?.total) > 0 
      ? (Number(completionStats?.completed) / Number(completionStats?.total)) * 100 
      : 0;

    // Mock additional metrics (would need more complex queries/tables)
    const performance = {
      averageRating: Number(avgRating?.average || 0),
      totalRatings: 0, // Would need count of ratings
      completionRate: Math.round(completionRate),
      totalDeliveries: Number(completionStats?.total || 0),
      completedDeliveries: Number(completionStats?.completed || 0),
      cancelledDeliveries: Number(completionStats?.cancelled || 0),
      onTimeDeliveryRate: 92, // Mock - would need delivery time tracking
      averageDeliveryTime: 28, // Mock - would need time tracking
      customerSatisfactionScore: 4.6 // Mock - would need detailed feedback system
    };

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error("Get driver performance error:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

export default router;
