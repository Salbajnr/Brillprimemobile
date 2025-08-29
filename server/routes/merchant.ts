
import { Router } from "express";
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users, orders, products, transactions, wallets, ratings } from '../../shared/schema';
import { eq, desc, and, gte, count, sum, sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  estimatedTime: z.number().optional(),
  notes: z.string().optional()
});

const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  unit: z.string().optional(),
  stockQuantity: z.number().min(0).optional(),
  category: z.string().optional(),
  isAvailable: z.boolean().optional()
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  unit: z.string().min(1),
  stockQuantity: z.number().min(0),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true)
});

// Get merchant dashboard metrics
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's orders and revenue
    const todayStats = await db
      .select({
        orders: count(),
        revenue: sum(sql`cast(${orders.totalAmount} as decimal)`)
      })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        gte(orders.createdAt, today)
      ));

    // Total orders and revenue
    const totalStats = await db
      .select({
        totalOrders: count(),
        totalRevenue: sum(sql`cast(${orders.totalAmount} as decimal)`)
      })
      .from(orders)
      .where(eq(orders.merchantId, merchantId));

    // Product statistics
    const productStats = await db
      .select({
        totalProducts: count(),
        activeProducts: count(sql`case when ${products.isAvailable} = true then 1 end`),
        lowStockProducts: count(sql`case when ${products.stockQuantity} <= 10 then 1 end`)
      })
      .from(products)
      .where(eq(products.merchantId, merchantId));

    // Recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        customerName: users.fullName,
        createdAt: orders.createdAt
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .where(eq(orders.merchantId, merchantId))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    const metrics = {
      todayOrders: Number(todayStats[0]?.orders || 0),
      todayRevenue: Number(todayStats[0]?.revenue || 0),
      totalOrders: Number(totalStats[0]?.totalOrders || 0),
      totalRevenue: Number(totalStats[0]?.totalRevenue || 0),
      productStats: {
        totalProducts: Number(productStats[0]?.totalProducts || 0),
        activeProducts: Number(productStats[0]?.activeProducts || 0),
        lowStockProducts: Number(productStats[0]?.lowStockProducts || 0)
      },
      recentOrders
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error("Get merchant dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard metrics" });
  }
});

// Get merchant orders
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const { status, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [eq(orders.merchantId, merchantId)];

    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as string));
    }

    const merchantOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryAddress: orders.deliveryAddress,
        orderType: orders.orderType,
        orderData: orders.orderData,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: users.fullName,
        customerPhone: users.phone,
        customerEmail: users.email
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: merchantOrders
    });
  } catch (error) {
    console.error("Get merchant orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
router.put("/orders/:orderId/status", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const validatedData = updateOrderStatusSchema.parse(req.body);

    // Verify order ownership
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.merchantId, merchantId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    if (validatedData.notes) {
      updateData.orderData = {
        ...order.orderData,
        merchantNotes: validatedData.notes,
        estimatedTime: validatedData.estimatedTime
      };
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Real-time notification (if WebSocket is available)
    if (global.io) {
      global.io.to(`user_${order.customerId}`).emit('order_status_update', {
        orderId,
        status: validatedData.status,
        estimatedTime: validatedData.estimatedTime,
        notes: validatedData.notes,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      data: updatedOrder 
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Get merchant products
router.get("/products", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const { category, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [eq(products.merchantId, merchantId)];

    if (category) {
      conditions.push(eq(products.category, category as string));
    }

    const merchantProducts = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: merchantProducts
    });
  } catch (error) {
    console.error("Get merchant products error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Create new product
router.post("/products", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const validatedData = createProductSchema.parse(req.body);

    const [newProduct] = await db.insert(products).values({
      ...validatedData,
      merchantId,
      price: validatedData.price.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.json({ 
      success: true, 
      data: newProduct 
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update product
router.put("/products/:productId", requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const validatedData = updateProductSchema.parse(req.body);

    // Verify product ownership
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.merchantId, merchantId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    if (validatedData.price) {
      updateData.price = validatedData.price.toString();
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    res.json({ 
      success: true, 
      data: updatedProduct 
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
router.delete("/products/:productId", requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    // Verify product ownership
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.merchantId, merchantId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await db
      .delete(products)
      .where(eq(products.id, productId));

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Get revenue analytics
router.get("/analytics/revenue", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current period revenue
    const [dailyRevenue] = await db
      .select({ revenue: sum(sql`cast(${orders.totalAmount} as decimal)`) })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, today)
      ));

    const [weeklyRevenue] = await db
      .select({ revenue: sum(sql`cast(${orders.totalAmount} as decimal)`) })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, weekStart)
      ));

    const [monthlyRevenue] = await db
      .select({ revenue: sum(sql`cast(${orders.totalAmount} as decimal)`) })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, monthStart)
      ));

    const [lastMonthRevenue] = await db
      .select({ revenue: sum(sql`cast(${orders.totalAmount} as decimal)`) })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        eq(orders.status, 'DELIVERED'),
        gte(orders.createdAt, lastMonthStart),
        gte(orders.createdAt, lastMonthEnd)
      ));

    // Calculate growth
    const currentMonth = Number(monthlyRevenue?.revenue || 0);
    const previousMonth = Number(lastMonthRevenue?.revenue || 0);
    const revenueGrowth = previousMonth > 0 ? 
      ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

    // Get wallet balance
    const [wallet] = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, merchantId))
      .limit(1);

    const analytics = {
      dailyRevenue: Number(dailyRevenue?.revenue || 0),
      weeklyRevenue: Number(weeklyRevenue?.revenue || 0),
      monthlyRevenue: currentMonth,
      revenueGrowth,
      escrowBalance: Number(wallet?.balance || 0),
      pendingWithdrawals: 0 // This would need a separate withdrawals table
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Get revenue analytics error:", error);
    res.status(500).json({ error: "Failed to fetch revenue analytics" });
  }
});

// Get merchant ratings and reviews
router.get("/reviews", requireAuth, async (req, res) => {
  try {
    const merchantId = req.user?.id;

    if (!merchantId || req.user?.role !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get reviews for merchant's orders
    const reviews = await db
      .select({
        id: ratings.id,
        rating: ratings.rating,
        comment: ratings.comment,
        createdAt: ratings.createdAt,
        customerName: users.fullName,
        orderNumber: orders.orderNumber,
        productName: products.name
      })
      .from(ratings)
      .leftJoin(orders, eq(ratings.orderId, orders.id))
      .leftJoin(users, eq(ratings.customerId, users.id))
      .leftJoin(products, eq(ratings.productId, products.id))
      .where(eq(orders.merchantId, merchantId))
      .orderBy(desc(ratings.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Calculate average rating
    const [avgRating] = await db
      .select({ average: sql`avg(${ratings.rating})` })
      .from(ratings)
      .leftJoin(orders, eq(ratings.orderId, orders.id))
      .where(eq(orders.merchantId, merchantId));

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: Number(avgRating?.average || 0),
        totalReviews: reviews.length
      }
    });
  } catch (error) {
    console.error("Get merchant reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

export default router;
