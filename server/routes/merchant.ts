
import { Router } from "express";
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// Validation schemas
const updateOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED']),
  estimatedTime: z.number().optional(),
  notes: z.string().optional()
});

const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  unit: z.string().optional(),
  stockLevel: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  category: z.string().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  unit: z.string().min(1),
  stockLevel: z.number().min(0),
  lowStockThreshold: z.number().min(0).default(10),
  category: z.string().min(1),
  images: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

// Get merchant dashboard metrics
router.get("/metrics", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;

    // Get business metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = {
      todayRevenue: 0,
      todaySales: 0,
      activeOrders: 0,
      customerCount: 0,
      lowStockAlerts: 0,
      pendingOrdersCount: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      inventoryValue: 0
    };

    // Calculate today's revenue and sales
    const todayOrders = await storage.getMerchantOrdersForDate(merchantId, today);
    metrics.todayRevenue = todayOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
    metrics.todaySales = todayOrders.length;

    // Get active orders count
    const activeOrders = await storage.getMerchantActiveOrders(merchantId);
    metrics.activeOrders = activeOrders.length;

    // Get customer count (unique customers who have ordered)
    const customers = await storage.getMerchantCustomers(merchantId);
    metrics.customerCount = customers.length;

    // Get products with low stock
    const products = await storage.getMerchantProducts(merchantId);
    metrics.lowStockAlerts = products.filter((p: any) => p.stockLevel <= p.lowStockThreshold).length;
    metrics.inventoryValue = products.reduce((sum: number, p: any) => sum + (p.price * p.stockLevel), 0);

    // Calculate pending orders
    metrics.pendingOrdersCount = activeOrders.filter((o: any) => o.status === 'NEW').length;

    // Calculate average order value
    if (todayOrders.length > 0) {
      metrics.averageOrderValue = metrics.todayRevenue / todayOrders.length;
    }

    res.json(metrics);
  } catch (error) {
    console.error("Get merchant metrics error:", error);
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

// Get merchant orders
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { status, limit = 50 } = req.query;

    let orders = await storage.getMerchantOrders(merchantId);

    if (status && status !== 'all') {
      orders = orders.filter((order: any) => order.status === status);
    }

    // Limit results
    orders = orders.slice(0, parseInt(limit as string));

    // Transform orders to match frontend interface
    const transformedOrders = orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber || `ORD-${order.id.slice(-6)}`,
      customerName: order.buyer?.fullName || 'Unknown Customer',
      customerPhone: order.buyer?.phone || '',
      customerEmail: order.buyer?.email || '',
      items: order.orderItems || [],
      totalAmount: order.totalPrice,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      orderDate: order.createdAt,
      estimatedPreparationTime: order.estimatedPreparationTime,
      driverId: order.driverId,
      driverName: order.driver?.fullName,
      orderType: order.orderType || 'DELIVERY',
      paymentStatus: order.paymentStatus || 'PENDING',
      urgentOrder: order.urgentOrder || false,
      notes: order.notes
    }));

    res.json(transformedOrders);
  } catch (error) {
    console.error("Get merchant orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Update order status
router.put("/orders/:orderId/status", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const merchantId = req.session!.userId!;
    const validatedData = updateOrderStatusSchema.parse(req.body);

    // Verify order ownership
    const order = await storage.getOrderById(orderId);
    if (!order || order.sellerId !== merchantId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update order status
    const updatedOrder = await storage.updateOrderStatus(orderId, validatedData.status, {
      estimatedPreparationTime: validatedData.estimatedTime,
      notes: validatedData.notes
    });

    // Emit real-time update
    if (global.io) {
      // Notify customer
      global.io.to(`user_${order.buyerId}`).emit('order_status_update', {
        orderId,
        status: validatedData.status,
        estimatedTime: validatedData.estimatedTime,
        notes: validatedData.notes,
        timestamp: Date.now()
      });

      // Notify driver if assigned
      if (order.driverId) {
        global.io.to(`user_${order.driverId}`).emit('order_status_update', {
          orderId,
          status: validatedData.status,
          timestamp: Date.now()
        });
      }
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Update order status error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// Assign driver to order
router.post("/orders/:orderId/assign-driver", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const merchantId = req.session!.userId!;

    // Verify order ownership
    const order = await storage.getOrderById(orderId);
    if (!order || order.sellerId !== merchantId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find available driver nearby
    const availableDrivers = await storage.getNearbyUsers(
      order.deliveryLatitude || 0,
      order.deliveryLongitude || 0,
      10000, // 10km radius
      'DRIVER'
    );

    if (availableDrivers.length === 0) {
      return res.status(404).json({ message: "No available drivers found" });
    }

    // Create delivery request and broadcast to drivers
    const deliveryRequest = {
      id: `DEL_${Date.now()}_${orderId}`,
      orderId,
      merchantId,
      customerId: order.buyerId,
      deliveryType: order.orderType || 'PACKAGE',
      pickupAddress: order.pickupAddress || 'Store Location',
      deliveryAddress: order.deliveryAddress,
      deliveryFee: order.deliveryFee || 1000,
      distance: 5.0, // Calculate actual distance
      estimatedTime: 30,
      orderValue: order.totalPrice,
      urgentDelivery: order.urgentOrder || false,
      customerName: order.buyer?.fullName || 'Customer',
      customerPhone: order.buyer?.phone || '',
      merchantName: 'Merchant', // Get from merchant profile
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // Broadcast to available drivers
    if (global.io) {
      availableDrivers.forEach(driver => {
        global.io.to(`user_${driver.userId}`).emit('delivery_request', deliveryRequest);
      });
    }

    res.json({
      success: true,
      message: "Driver assignment requested",
      deliveryRequestId: deliveryRequest.id
    });
  } catch (error) {
    console.error("Assign driver error:", error);
    res.status(500).json({ message: "Failed to assign driver" });
  }
});

// Get merchant products
router.get("/products", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const products = await storage.getMerchantProducts(merchantId);

    // Transform products to match frontend interface
    const transformedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      stockLevel: product.stockLevel || 0,
      lowStockThreshold: product.lowStockThreshold || 10,
      category: product.categoryName || 'General',
      images: product.images || [],
      isActive: product.isActive !== false,
      inStock: product.inStock !== false,
      totalSold: product.totalSold || 0,
      totalViews: product.totalViews || 0,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error("Get merchant products error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Create new product
router.post("/products", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const validatedData = createProductSchema.parse(req.body);

    const newProduct = await storage.createProduct({
      ...validatedData,
      sellerId: merchantId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error("Create product error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create product" });
  }
});

// Update product
router.put("/products/:productId", requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const merchantId = req.session!.userId!;
    const validatedData = updateProductSchema.parse(req.body);

    // Verify product ownership
    const product = await storage.getProductById(productId);
    if (!product || product.sellerId !== merchantId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedProduct = await storage.updateProduct(productId, validatedData);

    res.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("Update product error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update product" });
  }
});

// Get revenue analytics
router.get("/revenue", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;

    const revenue = {
      totalRevenue: 0,
      monthlyRevenue: 0,
      weeklyRevenue: 0,
      dailyRevenue: 0,
      escrowBalance: 0,
      pendingWithdrawals: 0,
      revenueGrowth: 0,
      topSellingProducts: []
    };

    // Get orders for different time periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const todayOrders = await storage.getMerchantOrdersForDate(merchantId, today);
    const weekOrders = await storage.getMerchantOrdersForPeriod(merchantId, weekStart, now);
    const monthOrders = await storage.getMerchantOrdersForPeriod(merchantId, monthStart, now);
    const lastMonthOrders = await storage.getMerchantOrdersForPeriod(merchantId, lastMonthStart, lastMonthEnd);
    const allOrders = await storage.getMerchantOrders(merchantId);

    revenue.dailyRevenue = todayOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);
    revenue.weeklyRevenue = weekOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);
    revenue.monthlyRevenue = monthOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);
    revenue.totalRevenue = allOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);

    // Calculate real growth from last month
    const lastMonthRevenue = lastMonthOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);
    if (lastMonthRevenue > 0) {
      revenue.revenueGrowth = ((revenue.monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    }

    // Get actual escrow balance from wallet/transactions
    const escrowBalance = await storage.getMerchantEscrowBalance(merchantId);
    revenue.escrowBalance = escrowBalance.availableBalance || 0;
    revenue.pendingWithdrawals = escrowBalance.pendingWithdrawals || 0;

    // Get top selling products
    const topProducts = await storage.getTopSellingProducts(merchantId, 5);
    revenue.topSellingProducts = topProducts;

    res.json(revenue);
  } catch (error) {
    console.error("Get revenue error:", error);
    res.status(500).json({ message: "Failed to fetch revenue data" });
  }
});

// Toggle business hours
router.put("/business-hours", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { isOpen } = req.body;

    await storage.updateMerchantBusinessHours(merchantId, isOpen);

    res.json({ success: true, isOpen });
  } catch (error) {
    console.error("Update business hours error:", error);
    res.status(500).json({ message: "Failed to update business hours" });
  }


// Get detailed sales analytics
router.get("/analytics/sales", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { period = 'month', startDate, endDate } = req.query;

    let start: Date, end: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      case 'custom':
        start = startDate ? new Date(startDate as string) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = endDate ? new Date(endDate as string) : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }

    const analytics = {
      period,
      dateRange: { start, end },
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalCustomers: 0,
        repeatCustomerRate: 0,
        cancellationRate: 0,
        fulfillmentRate: 0
      },
      trends: {
        dailyRevenue: [],
        dailyOrders: [],
        hourlyDistribution: []
      },
      productPerformance: [],
      customerSegments: {
        newCustomers: 0,
        returningCustomers: 0,
        highValueCustomers: 0
      },
      paymentMethods: [],
      deliveryMetrics: {
        averageDeliveryTime: 0,
        onTimeDeliveryRate: 0,
        deliverySuccessRate: 0
      }
    };

    // Get orders for the period
    const orders = await storage.getMerchantOrdersForPeriod(merchantId, start, end);
    
    // Calculate summary metrics
    analytics.summary.totalOrders = orders.length;
    analytics.summary.totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0);
    analytics.summary.averageOrderValue = analytics.summary.totalOrders > 0 ? 
      analytics.summary.totalRevenue / analytics.summary.totalOrders : 0;

    // Calculate unique customers
    const uniqueCustomers = new Set(orders.map((order: any) => order.buyerId));
    analytics.summary.totalCustomers = uniqueCustomers.size;

    // Calculate rates
    const cancelledOrders = orders.filter((order: any) => order.status === 'CANCELLED');
    const completedOrders = orders.filter((order: any) => order.status === 'DELIVERED');
    
    analytics.summary.cancellationRate = orders.length > 0 ? 
      (cancelledOrders.length / orders.length) * 100 : 0;
    analytics.summary.fulfillmentRate = orders.length > 0 ? 
      (completedOrders.length / orders.length) * 100 : 0;

    // Get product performance
    const productStats = await storage.getProductSalesStats(merchantId, start, end);
    analytics.productPerformance = productStats;

    // Calculate daily trends
    const dailyStats = await storage.getDailySalesStats(merchantId, start, end);
    analytics.trends.dailyRevenue = dailyStats.revenue;
    analytics.trends.dailyOrders = dailyStats.orders;

    // Get payment method distribution
    const paymentStats = await storage.getPaymentMethodStats(merchantId, start, end);
    analytics.paymentMethods = paymentStats;

    res.json(analytics);
  } catch (error) {
    console.error("Get sales analytics error:", error);
    res.status(500).json({ message: "Failed to fetch sales analytics" });
  }
});

// Get customer analytics
router.get("/analytics/customers", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    
    const customerAnalytics = {
      totalCustomers: 0,
      newCustomersThisMonth: 0,
      returningCustomersThisMonth: 0,
      averageOrdersPerCustomer: 0,
      customerLifetimeValue: 0,
      topCustomers: [],
      customerSegments: {
        highValue: 0,
        regular: 0,
        occasional: 0
      },
      geographicDistribution: [],
      orderFrequency: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        quarterly: 0
      }
    };

    // Get all customers who have ordered from this merchant
    const customers = await storage.getMerchantCustomers(merchantId);
    customerAnalytics.totalCustomers = customers.length;

    // Get new customers this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomers = await storage.getNewMerchantCustomers(merchantId, monthStart);
    customerAnalytics.newCustomersThisMonth = newCustomers.length;

    // Calculate customer segments and metrics
    const customerStats = await storage.getCustomerStats(merchantId);
    customerAnalytics.averageOrdersPerCustomer = customerStats.averageOrders;
    customerAnalytics.customerLifetimeValue = customerStats.averageLifetimeValue;
    customerAnalytics.topCustomers = customerStats.topCustomers;
    customerAnalytics.customerSegments = customerStats.segments;

    res.json(customerAnalytics);
  } catch (error) {
    console.error("Get customer analytics error:", error);
    res.status(500).json({ message: "Failed to fetch customer analytics" });
  }
});

// Get inventory analytics
router.get("/analytics/inventory", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    
    const inventoryAnalytics = {
      totalProducts: 0,
      activeProducts: 0,
      outOfStockProducts: 0,
      lowStockProducts: 0,
      totalInventoryValue: 0,
      fastMovingProducts: [],
      slowMovingProducts: [],
      stockTurnoverRate: 0,
      stockAlerts: [],
      categoryPerformance: []
    };

    const products = await storage.getMerchantProducts(merchantId);
    
    inventoryAnalytics.totalProducts = products.length;
    inventoryAnalytics.activeProducts = products.filter((p: any) => p.isActive && p.inStock).length;
    inventoryAnalytics.outOfStockProducts = products.filter((p: any) => !p.inStock).length;
    inventoryAnalytics.lowStockProducts = products.filter((p: any) => 
      p.stockLevel <= p.lowStockThreshold).length;
    
    inventoryAnalytics.totalInventoryValue = products.reduce((sum: number, p: any) => 
      sum + (parseFloat(p.price) * (p.stockLevel || 0)), 0);

    // Get product performance data
    const productPerformance = await storage.getProductPerformanceStats(merchantId);
    inventoryAnalytics.fastMovingProducts = productPerformance.fast;
    inventoryAnalytics.slowMovingProducts = productPerformance.slow;

    // Get stock alerts
    const stockAlerts = products
      .filter((p: any) => p.stockLevel <= p.lowStockThreshold || !p.inStock)
      .map((p: any) => ({
        productId: p.id,
        productName: p.name,


// Send message to customer
router.post("/customers/:customerId/message", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { customerId } = req.params;
    const { message, messageType = 'TEXT', orderId } = req.body;

    // Verify customer relationship
    const customerOrders = await storage.getCustomerOrdersWithMerchant(customerId, merchantId);
    if (customerOrders.length === 0) {
      return res.status(403).json({ message: "No business relationship with this customer" });
    }

    const messageData = {
      senderId: merchantId,
      receiverId: customerId,
      content: message,
      messageType,
      orderId,
      conversationType: 'MERCHANT_CUSTOMER',
      timestamp: new Date()
    };

    const savedMessage = await storage.saveMessage(messageData);

    // Send real-time notification
    if (global.io) {
      global.io.to(`user_${customerId}`).emit('new_message', {
        ...savedMessage,
        senderType: 'MERCHANT',
        senderName: 'Merchant' // Get merchant business name
      });
    }

    res.json({ success: true, message: savedMessage });
  } catch (error) {
    console.error("Send customer message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// Get customer conversations
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    
    const conversations = await storage.getMerchantConversations(merchantId);
    
    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Send promotional broadcast
router.post("/broadcast", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { 
      title, 
      message, 
      targetAudience = 'ALL_CUSTOMERS', 
      scheduledTime,
      includePromotions = false,
      promotionDetails 
    } = req.body;

    let targetCustomers = [];

    switch (targetAudience) {
      case 'ALL_CUSTOMERS':
        targetCustomers = await storage.getMerchantCustomers(merchantId);
        break;
      case 'RECENT_CUSTOMERS':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        targetCustomers = await storage.getRecentMerchantCustomers(merchantId, thirtyDaysAgo);
        break;
      case 'HIGH_VALUE_CUSTOMERS':
        targetCustomers = await storage.getHighValueCustomers(merchantId);
        break;
      case 'REPEAT_CUSTOMERS':
        targetCustomers = await storage.getRepeatCustomers(merchantId);
        break;
    }

    const broadcast = {
      id: `BC_${Date.now()}_${merchantId}`,
      merchantId,
      title,
      message,
      targetAudience,
      targetCount: targetCustomers.length,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
      includePromotions,
      promotionDetails,
      status: scheduledTime ? 'SCHEDULED' : 'SENT',
      createdAt: new Date()
    };

    await storage.saveBroadcast(broadcast);

    // Send immediately if not scheduled
    if (!scheduledTime) {
      // Send to all target customers
      for (const customer of targetCustomers) {
        const notification = {
          userId: customer.userId,
          title,
          message,
          type: 'MERCHANT_BROADCAST',
          isRead: false,
          merchantId,
          broadcastId: broadcast.id,
          promotionDetails: includePromotions ? promotionDetails : null
        };

        await storage.createNotification(notification);

        // Real-time notification
        if (global.io) {
          global.io.to(`user_${customer.userId}`).emit('notification', notification);
        }
      }
    }

    res.json({ 
      success: true, 
      broadcast, 
      message: `Broadcast ${scheduledTime ? 'scheduled' : 'sent'} to ${targetCustomers.length} customers` 
    });
  } catch (error) {
    console.error("Send broadcast error:", error);
    res.status(500).json({ message: "Failed to send broadcast" });
  }
});

// Get customer feedback and reviews
router.get("/feedback", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { page = 1, limit = 20, rating, productId } = req.query;

    const feedback = await storage.getMerchantFeedback(merchantId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      rating: rating ? parseInt(rating as string) : undefined,
      productId: productId as string
    });

    const summary = await storage.getMerchantFeedbackSummary(merchantId);

    res.json({
      feedback: feedback.reviews,
      pagination: feedback.pagination,
      summary
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

// Respond to customer review
router.post("/feedback/:reviewId/respond", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { reviewId } = req.params;
    const { response } = req.body;

    // Verify review belongs to merchant's product
    const review = await storage.getReviewById(reviewId);
    if (!review || review.merchantId !== merchantId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const merchantResponse = await storage.addMerchantResponse(reviewId, {
      merchantId,
      response,
      responseDate: new Date()
    });

    // Notify customer of response
    if (global.io) {
      global.io.to(`user_${review.customerId}`).emit('merchant_response', {
        reviewId,
        merchantResponse,
        productName: review.productName
      });
    }

    res.json({ success: true, response: merchantResponse });
  } catch (error) {
    console.error("Respond to review error:", error);
    res.status(500).json({ message: "Failed to respond to review" });
  }
});

        currentStock: p.stockLevel,
        threshold: p.lowStockThreshold,
        alertType: !p.inStock ? 'OUT_OF_STOCK' : 'LOW_STOCK'
      }));
    
    inventoryAnalytics.stockAlerts = stockAlerts;

    res.json(inventoryAnalytics);
  } catch (error) {
    console.error("Get inventory analytics error:", error);
    res.status(500).json({ message: "Failed to fetch inventory analytics" });
  }
});

// Generate sales report
router.get("/reports/sales", requireAuth, async (req, res) => {
  try {
    const merchantId = req.session!.userId!;
    const { startDate, endDate, format = 'json' } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const report = await storage.generateSalesReport(merchantId, start, end);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv`);
      
      // Convert to CSV format
      const csvData = [
        ['Date', 'Order Number', 'Customer', 'Products', 'Amount', 'Status', 'Payment Method'],
        ...report.orders.map((order: any) => [
          new Date(order.createdAt).toLocaleDateString(),
          order.orderNumber,
          order.customerName,
          order.items.map((i: any) => `${i.productName} x${i.quantity}`).join('; '),
          order.totalAmount,
          order.status,
          order.paymentMethod
        ])
      ];
      
      const csvString = csvData.map(row => row.join(',')).join('\n');
      return res.send(csvString);
    }

    res.json(report);
  } catch (error) {
    console.error("Generate sales report error:", error);
    res.status(500).json({ message: "Failed to generate sales report" });
  }
});

});

export default router;
