
import express from "express";
import { db } from "../db";
import { users, orders, products, categories, transactions, driverProfiles, merchantProfiles } from "../../shared/schema";
import { eq, desc, and, or, like, gte, lte, count, sql } from "drizzle-orm";
import { authenticateUser } from "../middleware/auth";

const router = express.Router();

// Missing Analytics Endpoints
router.get("/analytics/dashboard", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    // Get dashboard metrics based on role
    if (userRole === 'ADMIN') {
      const [totalUsers, totalOrders, totalRevenue, activeDrivers] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(orders),
        db.select({ 
          total: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`
        }).from(orders).where(eq(orders.status, 'DELIVERED')),
        db.select({ count: count() }).from(driverProfiles).where(eq(driverProfiles.isAvailable, true))
      ]);

      res.json({
        success: true,
        data: {
          totalUsers: totalUsers[0].count,
          totalOrders: totalOrders[0].count,
          totalRevenue: totalRevenue[0].total || 0,
          activeDrivers: activeDrivers[0].count
        }
      });
    } else if (userRole === 'MERCHANT') {
      const merchantOrders = await db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.merchantId, userId));

      res.json({
        success: true,
        data: {
          totalOrders: merchantOrders[0].count,
          revenue: 0,
          pendingOrders: 0
        }
      });
    } else {
      res.json({ success: true, data: { orders: 0, spending: 0 } });
    }
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

router.get("/analytics/real-time", authenticateUser, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [recentOrders, recentTransactions] = await Promise.all([
      db.select({ count: count() }).from(orders).where(gte(orders.createdAt, oneHourAgo)),
      db.select({ count: count() }).from(transactions).where(gte(transactions.createdAt, oneHourAgo))
    ]);

    res.json({
      success: true,
      data: {
        recentOrders: recentOrders[0].count,
        recentTransactions: recentTransactions[0].count,
        timestamp: now.toISOString()
      }
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get real-time data' });
  }
});

// Missing Driver Endpoints
router.get("/driver/dashboard", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    const [driverProfile, assignedOrders, earnings] = await Promise.all([
      db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId)).limit(1),
      db.select({ count: count() }).from(orders).where(eq(orders.driverId, userId)),
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
      }).from(transactions).where(eq(transactions.userId, userId))
    ]);

    res.json({
      success: true,
      data: {
        profile: driverProfile[0] || null,
        totalOrders: assignedOrders[0].count,
        totalEarnings: earnings[0].total || 0,
        isAvailable: driverProfile[0]?.isAvailable || false
      }
    });
  } catch (error) {
    console.error('Driver dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get driver dashboard' });
  }
});

router.get("/driver/orders/available", authenticateUser, async (req, res) => {
  try {
    const availableOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.status, 'PENDING'),
        sql`${orders.driverId} IS NULL`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    res.json({
      success: true,
      data: availableOrders
    });
  } catch (error) {
    console.error('Available orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to get available orders' });
  }
});

router.post("/driver/delivery/accept", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;
    const driverId = req.session?.userId;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        driverId,
        status: 'CONFIRMED',
        updatedAt: new Date()
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.status, 'PENDING'),
        sql`${orders.driverId} IS NULL`
      ))
      .returning();

    if (!updatedOrder) {
      return res.status(400).json({ success: false, error: 'Order not available' });
    }

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept delivery' });
  }
});

router.post("/driver/location", authenticateUser, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.session?.userId;

    await db
      .update(driverProfiles)
      .set({
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

router.put("/driver/status", authenticateUser, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const userId = req.session?.userId;

    await db
      .update(driverProfiles)
      .set({
        isAvailable,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

router.get("/driver/earnings", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;

    const earnings = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
        count: count()
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.paymentStatus, 'COMPLETED')
      ));

    res.json({
      success: true,
      data: {
        totalEarnings: earnings[0].total || 0,
        totalTrips: earnings[0].count
      }
    });
  } catch (error) {
    console.error('Driver earnings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get earnings' });
  }
});

// Missing Merchant Endpoints
router.get("/merchant/dashboard", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;

    const [merchantProfile, merchantOrders, revenue] = await Promise.all([
      db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1),
      db.select({ count: count() }).from(orders).where(eq(orders.merchantId, userId)),
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`
      }).from(orders).where(and(
        eq(orders.merchantId, userId),
        eq(orders.status, 'DELIVERED')
      ))
    ]);

    res.json({
      success: true,
      data: {
        profile: merchantProfile[0] || null,
        totalOrders: merchantOrders[0].count,
        totalRevenue: revenue[0].total || 0
      }
    });
  } catch (error) {
    console.error('Merchant dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get merchant dashboard' });
  }
});

router.get("/merchant/products", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;

    const merchantProducts = await db
      .select()
      .from(products)
      .where(eq(products.sellerId, userId))
      .orderBy(desc(products.createdAt));

    res.json({
      success: true,
      data: merchantProducts
    });
  } catch (error) {
    console.error('Merchant products error:', error);
    res.status(500).json({ success: false, error: 'Failed to get products' });
  }
});

router.get("/merchant/orders", authenticateUser, async (req, res) => {
  try {
    const userId = req.session?.userId;

    const merchantOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.merchantId, userId))
      .orderBy(desc(orders.createdAt));

    res.json({
      success: true,
      data: merchantOrders
    });
  } catch (error) {
    console.error('Merchant orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to get orders' });
  }
});

router.put("/merchant/orders/:orderId/status", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.session?.userId;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.merchantId, userId)
      ))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

router.post("/merchant/orders/:orderId/assign-driver", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    const userId = req.session?.userId;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        driverId,
        status: 'CONFIRMED',
        updatedAt: new Date()
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.merchantId, userId)
      ))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign driver' });
  }
});

// Missing Payment Verification Endpoint
router.get("/payments/verify/:reference", authenticateUser, async (req, res) => {
  try {
    const { reference } = req.params;

    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionRef, reference))
      .limit(1);

    if (transaction.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Mock verification - in production, verify with Paystack
    const verified = true;

    if (verified) {
      await db
        .update(transactions)
        .set({
          paymentStatus: 'COMPLETED',
          updatedAt: new Date()
        })
        .where(eq(transactions.transactionRef, reference));
    }

    res.json({
      success: true,
      data: {
        reference,
        status: verified ? 'success' : 'failed',
        transaction: transaction[0]
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

router.get("/payments/methods", authenticateUser, async (req, res) => {
  try {
    // Mock payment methods
    const methods = [
      { id: 1, type: 'card', name: 'Credit/Debit Card', available: true },
      { id: 2, type: 'bank', name: 'Bank Transfer', available: true },
      { id: 3, type: 'wallet', name: 'Wallet', available: true }
    ];

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment methods' });
  }
});

router.post("/payments/escrow", authenticateUser, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.session?.userId;

    // Create escrow transaction
    const [escrowTx] = await db.insert(transactions).values({
      orderId,
      userId,
      amount: amount.toString(),
      paymentMethod: 'escrow',
      paymentStatus: 'PENDING',
      transactionRef: `escrow_${Date.now()}`,
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: escrowTx
    });
  } catch (error) {
    console.error('Escrow payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create escrow payment' });
  }
});

export default router;
