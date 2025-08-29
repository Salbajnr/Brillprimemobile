
import express from 'express';
import { db } from '../db';
import { users, orders, products, categories, transactions, wallets, ratings } from '../../shared/schema';
import { eq, desc, and, gte, lte, like, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get consumer dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    // Get recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        orderType: orders.orderType
      })
      .from(orders)
      .where(eq(orders.customerId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // Get wallet balance
    const wallet = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    // Get order statistics
    const orderStats = await db
      .select({
        total: sql`count(*)`,
        completed: sql`count(case when status = 'DELIVERED' then 1 end)`,
        pending: sql`count(case when status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS') then 1 end)`
      })
      .from(orders)
      .where(eq(orders.customerId, userId));

    res.json({
      success: true,
      data: {
        recentOrders,
        walletBalance: wallet[0]?.balance || '0',
        orderStats: orderStats[0] || { total: 0, completed: 0, pending: 0 }
      }
    });
  } catch (error) {
    console.error('Consumer dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get consumer profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        isVerified: users.isVerified,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get consumer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.name);

    res.json({
      success: true,
      data: allCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get products with filtering
router.get('/products', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      page = 1, 
      limit = 20,
      merchantId 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      category: products.category,
      imageUrl: products.imageUrl,
      isAvailable: products.isAvailable,
      merchantId: products.merchantId,
      stockQuantity: products.stockQuantity,
      unit: products.unit
    }).from(products);

    let conditions = [eq(products.isAvailable, true)];

    if (category) {
      conditions.push(eq(products.category, category as string));
    }

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    if (minPrice) {
      conditions.push(gte(sql`cast(${products.price} as decimal)`, Number(minPrice)));
    }

    if (maxPrice) {
      conditions.push(lte(sql`cast(${products.price} as decimal)`, Number(maxPrice)));
    }

    if (merchantId) {
      conditions.push(eq(products.merchantId, Number(merchantId)));
    }

    const productList = await query
      .where(and(...conditions))
      .limit(Number(limit))
      .offset(offset)
      .orderBy(products.createdAt);

    res.json({
      success: true,
      data: productList
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product details
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.isAvailable, true)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product ratings
    const productRatings = await db
      .select({
        rating: ratings.rating,
        comment: ratings.comment,
        customerName: users.fullName,
        createdAt: ratings.createdAt
      })
      .from(ratings)
      .leftJoin(users, eq(ratings.customerId, users.id))
      .where(eq(ratings.productId, productId))
      .orderBy(desc(ratings.createdAt))
      .limit(10);

    // Calculate average rating
    const avgRating = await db
      .select({ average: sql`avg(${ratings.rating})` })
      .from(ratings)
      .where(eq(ratings.productId, productId));

    res.json({
      success: true,
      data: {
        ...product,
        averageRating: Number(avgRating[0]?.average || 0),
        ratings: productRatings
      }
    });
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Get consumer orders
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [eq(orders.customerId, userId)];
    
    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as string));
    }

    const consumerOrders = await db
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
        merchantName: users.fullName
      })
      .from(orders)
      .leftJoin(users, eq(orders.merchantId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: consumerOrders
    });
  } catch (error) {
    console.error('Get consumer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create new order
router.post('/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const { 
      merchantId, 
      orderType, 
      totalAmount, 
      deliveryAddress, 
      orderData 
    } = req.body;

    if (!merchantId || !orderType || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderNumber = `ORD-${Date.now()}-${userId}`;

    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      customerId: userId,
      merchantId,
      orderType,
      status: 'PENDING',
      totalAmount: totalAmount.toString(),
      deliveryAddress,
      orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: newOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get single order details
router.get('/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const [order] = await db
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
        merchantName: users.fullName,
        merchantPhone: users.phone
      })
      .from(orders)
      .leftJoin(users, eq(orders.merchantId, users.id))
      .where(and(
        eq(orders.id, orderId),
        eq(orders.customerId, userId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Cancel order
router.patch('/orders/:orderId/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { reason } = req.body;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    // Check if order belongs to user and can be cancelled
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.customerId, userId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: 'CANCELLED',
        orderData: {
          ...order.orderData,
          cancellationReason: reason,
          cancelledAt: new Date().toISOString()
        },
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Rate product/service
router.post('/ratings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const { orderId, productId, rating, comment } = req.body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }

    // Verify order belongs to user and is completed
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.customerId, userId),
        eq(orders.status, 'DELIVERED')
      ))
      .limit(1);

    if (!order) {
      return res.status(400).json({ error: 'Invalid order for rating' });
    }

    const [newRating] = await db.insert(ratings).values({
      customerId: userId,
      orderId,
      productId: productId || null,
      rating,
      comment: comment || null,
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: newRating,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || req.user?.role !== 'CONSUMER') {
      return res.status(403).json({ error: 'Consumer access required' });
    }

    const { page = 1, limit = 20, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [eq(transactions.userId, userId)];
    
    if (type) {
      conditions.push(eq(transactions.type, type as string));
    }

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: userTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
