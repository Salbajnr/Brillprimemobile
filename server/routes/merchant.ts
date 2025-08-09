import { Express } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';

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

export function registerMerchantRoutes(app: Express) {
  // Get merchant dashboard metrics
  app.get("/api/merchant/metrics", requireAuth, async (req, res) => {
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
  app.get("/api/merchant/orders", requireAuth, async (req, res) => {
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
  app.put("/api/merchant/orders/:orderId/status", requireAuth, async (req, res) => {
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
  app.post("/api/merchant/orders/:orderId/assign-driver", requireAuth, async (req, res) => {
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
  app.get("/api/merchant/products", requireAuth, async (req, res) => {
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
  app.post("/api/merchant/products", requireAuth, async (req, res) => {
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
  app.put("/api/merchant/products/:productId", requireAuth, async (req, res) => {
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
  app.get("/api/merchant/revenue", requireAuth, async (req, res) => {
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

      const todayOrders = await storage.getMerchantOrdersForDate(merchantId, today);
      const weekOrders = await storage.getMerchantOrdersForPeriod(merchantId, weekStart, now);
      const monthOrders = await storage.getMerchantOrdersForPeriod(merchantId, monthStart, now);
      const allOrders = await storage.getMerchantOrders(merchantId);

      revenue.dailyRevenue = todayOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
      revenue.weeklyRevenue = weekOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
      revenue.monthlyRevenue = monthOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
      revenue.totalRevenue = allOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);

      // Mock escrow balance (this would come from payment processor)
      revenue.escrowBalance = revenue.monthlyRevenue * 0.8; // 80% available
      revenue.pendingWithdrawals = revenue.monthlyRevenue * 0.2; // 20% pending

      // Calculate growth (mock)
      revenue.revenueGrowth = 12.5;

      res.json(revenue);
    } catch (error) {
      console.error("Get revenue error:", error);
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  // Toggle business hours
  app.put("/api/merchant/business-hours", requireAuth, async (req, res) => {
    try {
      const merchantId = req.session!.userId!;
      const { isOpen } = req.body;

      await storage.updateMerchantBusinessHours(merchantId, isOpen);

      res.json({ success: true, isOpen });
    } catch (error) {
      console.error("Update business hours error:", error);
      res.status(500).json({ message: "Failed to update business hours" });
    }
  });
}