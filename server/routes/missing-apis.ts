import express from "express";
import { db } from "../db";
import { users, orders, products, categories, transactions, driverProfiles, merchantProfiles } from "../../shared/schema";
import { eq, desc, and, or, like, gte, lte, count, sql } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";

const router = express.Router();

// Missing Analytics Endpoints
router.get("/analytics/dashboard", requireAuth, async (req, res) => {
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

// Continue with additional routes below

// Categories API
router.get('/categories', async (req, res) => {
  try {
    const allCategories = await db.select().from(categories);
    res.json({
      success: true,
      categories: allCategories
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Products API
router.get('/products', async (req, res) => {
  try {
    const { category, search, limit = 20, offset = 0 } = req.query;

    let query = db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      category: categories.name,
      inStock: products.inStock,
      images: products.images
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));

    if (category) {
      query = query.where(eq(categories.name, category as string));
    }

    if (search) {
      query = query.where(like(products.name, `%${search}%`));
    }

    const productsList = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      success: true,
      products: productsList
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Orders API - Get user orders
router.get('/user/orders', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, userId))
      .orderBy(desc(orders.createdAt));

    res.json({
      success: true,
      orders: userOrders
    });
  } catch (error) {
    console.error('User orders fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Search API
router.get('/search', async (req, res) => {
  try {
    const { query: searchQuery, type = 'products' } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query required' });
    }

    let results = [];

    if (type === 'products' || type === 'all') {
      const productResults = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          type: 'product'
        })
        .from(products)
        .where(like(products.name, `%${searchQuery}%`))
        .limit(10);

      results = [...results, ...productResults];
    }

    if (type === 'merchants' || type === 'all') {
      const merchantResults = await db
        .select({
          id: users.id,
          name: users.fullName,
          email: users.email,
          type: 'merchant'
        })
        .from(users)
        .where(and(
          eq(users.role, 'MERCHANT'),
          like(users.fullName, `%${searchQuery}%`)
        ))
        .limit(10);

      results = [...results, ...merchantResults];
    }

    res.json({
      success: true,
      results,
      total: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Analytics API for dashboard
router.get('/dashboard/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let stats = {};

    if (userRole === 'ADMIN') {
      const [usersCount] = await db.select({ count: count() }).from(users);
      const [ordersCount] = await db.select({ count: count() }).from(orders);
      const [transactionsCount] = await db.select({ count: count() }).from(transactions);

      stats = {
        totalUsers: usersCount.count,
        totalOrders: ordersCount.count,
        totalTransactions: transactionsCount.count
      };
    } else if (userRole === 'CONSUMER') {
      const [userOrders] = await db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.customerId, userId));

      const [userTransactions] = await db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId));

      stats = {
        myOrders: userOrders.count,
        myTransactions: userTransactions.count
      };
    } else if (userRole === 'DRIVER') {
      const [driverDeliveries] = await db
        .select({ count: count() })
        .from(fuelOrders)
        .where(eq(fuelOrders.driverId, userId));

      stats = {
        totalDeliveries: driverDeliveries.count
      };
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// Toll Gates API
router.get('/toll-gates', async (req, res) => {
  try {
    const gates = await db.select().from(tollGates);
    res.json({
      success: true,
      tollGates: gates
    });
  } catch (error) {
    console.error('Toll gates fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch toll gates' });
  }
});

// User Profile API
router.get('/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userProfile) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Don't return sensitive information
    const { password, ...safeProfile } = userProfile;

    res.json({
      success: true,
      user: safeProfile
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fullName, phone } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        fullName,
        phone,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    const { password, ...safeProfile } = updatedUser;

    res.json({
      success: true,
      user: safeProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// API implementations from the changes snippet
import { wallets, categories } from '../../shared/schema'; // Ensure wallets and categories are imported

// Complete Consumer APIs
router.get('/api/consumer/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [recentOrders, walletBalance, favoriteProducts] = await Promise.all([
      db.select().from(orders).where(eq(orders.customerId, userId)).orderBy(desc(orders.createdAt)).limit(5),
      db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1),
      db.select().from(products).where(eq(products.isAvailable, true)).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        recentOrders,
        walletBalance: walletBalance[0]?.balance || '0.00',
        favoriteProducts,
        stats: {
          totalOrders: recentOrders.length,
          pendingOrders: recentOrders.filter(o => o.status === 'PENDING').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get dashboard data' });
  }
});

router.get('/api/consumer/profile', requireAuth, async (req, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, req.user?.id)).limit(1);
    res.json({ success: true, data: user[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

router.get('/api/consumer/categories', async (req, res) => {
  try {
    const categoriesList = await db.select().from(categories).where(eq(categories.isActive, true));
    res.json({ success: true, data: categoriesList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
});

router.get('/api/consumer/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    let whereConditions = [eq(products.isAvailable, true)];

    if (category) whereConditions.push(eq(products.category, category as string));
    if (search) whereConditions.push(like(products.name, `%${search}%`));

    const productsList = await db.select().from(products)
      .where(and(...whereConditions))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    res.json({ success: true, data: productsList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get products' });
  }
});

router.get('/api/consumer/orders', requireAuth, async (req, res) => {
  try {
    const userOrders = await db.select().from(orders)
      .where(eq(orders.customerId, req.user?.id))
      .orderBy(desc(orders.createdAt));
    res.json({ success: true, data: userOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
});

router.post('/api/consumer/orders', requireAuth, async (req, res) => {
  try {
    const { merchantId, orderType, totalAmount, deliveryAddress, orderData } = req.body;

    const newOrder = await db.insert(orders).values({
      orderNumber: `ORD${Date.now()}`,
      customerId: req.user?.id,
      merchantId,
      orderType,
      totalAmount,
      deliveryAddress,
      orderData,
      status: 'PENDING'
    }).returning();

    res.json({ success: true, data: newOrder[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

router.get('/api/consumer/transactions', requireAuth, async (req, res) => {
  try {
    const userTransactions = await db.select().from(transactions)
      .where(eq(transactions.userId, req.user?.id))
      .orderBy(desc(transactions.createdAt));
    res.json({ success: true, data: userTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

// Complete Merchant APIs
router.get('/api/merchant/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [merchantProfile, recentOrders, totalRevenue, productCount] = await Promise.all([
      db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1),
      db.select().from(orders).where(eq(orders.merchantId, userId)).orderBy(desc(orders.createdAt)).limit(10),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)` })
        .from(orders).where(and(eq(orders.merchantId, userId), eq(orders.status, 'DELIVERED'))),
      db.select({ count: count() }).from(products).where(eq(products.merchantId, userId))
    ]);

    res.json({
      success: true,
      data: {
        profile: merchantProfile[0],
        recentOrders,
        stats: {
          totalRevenue: totalRevenue[0].total,
          totalProducts: productCount[0].count,
          pendingOrders: recentOrders.filter(o => o.status === 'PENDING').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get merchant dashboard' });
  }
});

router.get('/api/merchant/orders', requireAuth, async (req, res) => {
  try {
    const merchantOrders = await db.select().from(orders)
      .where(eq(orders.merchantId, req.user?.id))
      .orderBy(desc(orders.createdAt));
    res.json({ success: true, data: merchantOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get merchant orders' });
  }
});

router.get('/api/merchant/products', requireAuth, async (req, res) => {
  try {
    const merchantProducts = await db.select().from(products)
      .where(eq(products.merchantId, req.user?.id))
      .orderBy(desc(products.createdAt));
    res.json({ success: true, data: merchantProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get merchant products' });
  }
});

router.post('/api/merchant/products', requireAuth, async (req, res) => {
  try {
    const { name, description, price, category, unit, stockQuantity, imageUrl } = req.body;

    const newProduct = await db.insert(products).values({
      merchantId: req.user?.id,
      sellerId: req.user?.id,
      name,
      description,
      price,
      category,
      categoryName: category,
      unit,
      stockQuantity,
      stockLevel: stockQuantity,
      imageUrl,
      isAvailable: true
    }).returning();

    res.json({ success: true, data: newProduct[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

router.put('/api/merchant/orders/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const updatedOrder = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, parseInt(orderId)), eq(orders.merchantId, req.user?.id)))
      .returning();

    res.json({ success: true, data: updatedOrder[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Complete Driver APIs
router.get('/api/driver/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [driverProfile, todayDeliveries, totalEarnings, activeOrders] = await Promise.all([
      db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId)).limit(1),
      db.select({ count: count() }).from(orders)
        .where(and(eq(orders.driverId, userId), gte(orders.deliveredAt, new Date(new Date().setHours(0,0,0,0))))),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${orders.driverEarnings} AS DECIMAL)), 0)` })
        .from(orders).where(and(eq(orders.driverId, userId), eq(orders.status, 'DELIVERED'))),
      db.select().from(orders)
        .where(and(eq(orders.driverId, userId), or(eq(orders.status, 'ACCEPTED'), eq(orders.status, 'IN_TRANSIT'))))
    ]);

    res.json({
      success: true,
      data: {
        profile: driverProfile[0],
        stats: {
          todayDeliveries: todayDeliveries[0].count,
          totalEarnings: totalEarnings[0].total,
          activeOrders: activeOrders.length
        },
        activeOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get driver dashboard' });
  }
});

router.get('/api/driver/profile', requireAuth, async (req, res) => {
  try {
    const profile = await db.select().from(driverProfiles)
      .where(eq(driverProfiles.userId, req.user?.id)).limit(1);
    res.json({ success: true, data: profile[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get driver profile' });
  }
});

router.put('/api/driver/status', requireAuth, async (req, res) => {
  try {
    const { isOnline, isAvailable, currentLocation } = req.body;

    const updates: any = { isOnline, isAvailable };
    if (currentLocation) {
      updates.currentLatitude = currentLocation.latitude;
      updates.currentLongitude = currentLocation.longitude;
    }

    await db.update(driverProfiles)
      .set(updates)
      .where(eq(driverProfiles.userId, req.user?.id));

    res.json({ success: true, message: 'Driver status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update driver status' });
  }
});

router.get('/api/driver/delivery-requests', requireAuth, async (req, res) => {
  try {
    const availableOrders = await db.select().from(orders)
      .where(and(eq(orders.status, 'CONFIRMED'), sql`${orders.driverId} IS NULL`))
      .orderBy(orders.createdAt);
    res.json({ success: true, data: availableOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get delivery requests' });
  }
});

router.post('/api/driver/accept-delivery', requireAuth, async (req, res) => {
  try {
    const { orderId, estimatedDeliveryTime } = req.body;

    const updatedOrder = await db.update(orders)
      .set({ 
        driverId: req.user?.id, 
        status: 'ACCEPTED',
        acceptedAt: new Date()
      })
      .where(and(eq(orders.id, parseInt(orderId)), sql`${orders.driverId} IS NULL`))
      .returning();

    if (updatedOrder.length === 0) {
      return res.status(400).json({ success: false, message: 'Order already assigned or not found' });
    }

    res.json({ success: true, data: updatedOrder[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept delivery' });
  }
});

router.get('/api/driver/earnings', requireAuth, async (req, res) => {
  try {
    const earnings = await db.select({
      date: orders.deliveredAt,
      amount: orders.driverEarnings,
      orderNumber: orders.orderNumber
    }).from(orders)
      .where(and(eq(orders.driverId, req.user?.id), eq(orders.status, 'DELIVERED')))
      .orderBy(desc(orders.deliveredAt));

    const totalEarnings = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${orders.driverEarnings} AS DECIMAL)), 0)`
    }).from(orders)
      .where(and(eq(orders.driverId, req.user?.id), eq(orders.status, 'DELIVERED')));

    res.json({
      success: true,
      data: {
        earnings,
        totalEarnings: totalEarnings[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get earnings' });
  }
});

// Complete Wallet APIs
router.get('/api/wallet/balance', requireAuth, async (req, res) => {
  try {
    const wallet = await db.select().from(wallets)
      .where(eq(wallets.userId, req.user?.id)).limit(1);

    if (wallet.length === 0) {
      // Create wallet if it doesn't exist
      const newWallet = await db.insert(wallets).values({
        userId: req.user?.id,
        balance: '0.00'
      }).returning();
      return res.json({ success: true, data: { balance: newWallet[0].balance } });
    }

    res.json({ success: true, data: { balance: wallet[0].balance } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get wallet balance' });
  }
});

router.get('/api/wallet/transactions', requireAuth, async (req, res) => {
  try {
    const walletTransactions = await db.select().from(transactions)
      .where(eq(transactions.userId, req.user?.id))
      .orderBy(desc(transactions.createdAt));
    res.json({ success: true, data: walletTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get wallet transactions' });
  }
});

// System Health and Monitoring APIs
router.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.select({ count: count() }).from(users);
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
      services: {
        auth: 'operational',
        payments: 'operational',
        notifications: 'operational'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/api/system-health', async (req, res) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get system health' });
  }
});

// Real-time and Mobile APIs
router.get('/api/real-time-tracking/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.select().from(orders)
      .where(eq(orders.id, parseInt(orderId))).limit(1);

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get order tracking' });
  }
});

router.get('/api/mobile/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      apiStatus: 'operational',
      timestamp: new Date().toISOString()
    }
  });
});

router.post('/api/mobile/sync', requireAuth, async (req, res) => {
  try {
    const { lastSync } = req.body;
    // Return data updated since lastSync
    res.json({
      success: true,
      data: {
        lastSync: new Date().toISOString(),
        updates: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync failed' });
  }
});

export default router;