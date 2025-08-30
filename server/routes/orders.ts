import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  orderType: z.enum(['PRODUCT', 'FUEL', 'COMMODITY', 'TOLL', 'BILL_PAYMENT']),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })).optional(),
  deliveryAddress: z.string().min(1),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  paymentMethod: z.string().default('wallet'),
  urgentOrder: z.boolean().default(false),
  notes: z.string().optional(),
  scheduledDelivery: z.string().optional()
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  ]),
  reason: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  notes: z.string().optional()
});

// Create new order
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const validatedData = createOrderSchema.parse(req.body);

    let totalAmount = 0;

    // Calculate total for product orders
    if (validatedData.orderType === 'PRODUCT' && validatedData.items) {
      for (const item of validatedData.items) {
        totalAmount += item.price * item.quantity;
      }
    }

    const order = await storage.createOrder({
      customerId: userId,
      orderNumber: `ORD${Date.now()}${userId}`,
      ...validatedData,
      totalAmount: totalAmount.toString(),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      estimatedPreparationTime: validatedData.urgentOrder ? 15 : 30
    });

    // Create transaction record
    await storage.createTransaction({
      orderId: order.id,
      userId,
      amount: totalAmount.toString(),
      currency: 'NGN',
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: 'PENDING',
      transactionRef: `ORD_${order.id}_${Date.now()}`,
      metadata: {
        orderId: order.id,
        orderType: validatedData.orderType
      }
    });

    // Emit real-time notification
    if ((global as any).io) {
      (global as any).io.emit('new_order', {
        type: 'NEW_ORDER',
        orderId: order.id,
        customerId: userId,
        orderType: validatedData.orderType,
        totalAmount,
        timestamp: Date.now()
      });
    }

    // Auto-assign driver if delivery coordinates are provided
    if (validatedData.deliveryLatitude && validatedData.deliveryLongitude) {
      // Import and use auto-assignment service
      const { AutoAssignmentService } = await import('../services/auto-assignment');
      
      // Attempt auto-assignment in background
      setTimeout(async () => {
        try {
          const assignmentResult = await AutoAssignmentService.assignBestDriver(
            order.id,
            {
              latitude: validatedData.deliveryLatitude!,
              longitude: validatedData.deliveryLongitude!
            }
          );
          
          if (assignmentResult) {
            console.log(`Auto-assigned order ${order.id} to driver ${assignmentResult.driverId}`);
          }
        } catch (error) {
          console.error('Auto-assignment failed:', error);
        }
      }, 2000); // 2 second delay to allow order processing
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid order data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
});

// Get orders with filtering
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);

    const {
      status,
      orderType,
      role = 'customer',
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    const filters = {
      status: status as string,
      orderType: orderType as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      dateFrom: dateFrom as string,
      dateTo: dateTo as string
    };

    let orders;

    // Filter based on user role
    switch (role) {
      case 'customer':
        orders = await storage.getCustomerOrders(userId, filters);
        break;
      case 'merchant':
        if (user?.role !== 'MERCHANT') {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }
        orders = await storage.getMerchantOrders(userId, filters);
        break;
      case 'driver':
        if (user?.role !== 'DRIVER') {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }
        orders = await storage.getDriverOrders(userId, filters);
        break;
      default:
        orders = await storage.getCustomerOrders(userId, filters);
    }

    res.json({
      success: true,
      orders: orders.orders,
      pagination: orders.pagination
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});

// Get single order details
router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { orderId } = req.params;

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check access permissions
    const hasAccess = order.customerId === userId || 
                     order.merchantId === userId || 
                     order.driverId === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get related data
    const [transactions, tracking] = await Promise.all([
      storage.getOrderTransactions(orderId),
      storage.getOrderTracking(orderId)
    ]);

    res.json({
      success: true,
      order,
      transactions,
      tracking
    });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
});

// Update order status
router.patch("/:orderId/status", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { orderId } = req.params;
    const validatedData = updateOrderStatusSchema.parse(req.body);

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check permissions
    const canUpdate = order.customerId === userId || 
                     order.merchantId === userId || 
                     order.driverId === userId;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Validate status transition
    const validTransitions = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['PICKED_UP', 'CANCELLED'],
      'PICKED_UP': ['OUT_FOR_DELIVERY'],
      'OUT_FOR_DELIVERY': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': []
    };

    const currentStatus = order.status;
    const newStatus = validatedData.status;

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${currentStatus} to ${newStatus}`
      });
    }

    // Update order
    const updatedOrder = await storage.updateOrderStatus(orderId, {
      status: newStatus,
      reason: validatedData.reason,
      updatedBy: userId,
      location: validatedData.location,
      notes: validatedData.notes
    });

    // Emit real-time update
    if ((global as any).io) {
      (global as any).io.to(`order_${orderId}`).emit('order_status_update', {
        orderId,
        status: newStatus,
        updatedBy: userId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid status data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
});

// Assign driver to order (Merchant/Admin only)
router.post("/:orderId/assign-driver", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);
    const { orderId } = req.params;
    const { driverId } = req.body;

    if (!user || (user.role !== 'MERCHANT' && user.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        message: "Only merchants and admins can assign drivers"
      });
    }

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Verify driver exists and is available
    const driver = await storage.getDriverProfile(driverId);
    if (!driver || !driver.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Driver not available"
      });
    }

    await storage.assignDriverToOrder(orderId, driverId);

    // Emit real-time notifications
    if ((global as any).io) {
      (global as any).io.to(`user_${driverId}`).emit('order_assigned', {
        orderId,
        orderType: order.orderType,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Driver assigned successfully"
    });
  } catch (error) {
    console.error("Assign driver error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign driver"
    });
  }
});

// Cancel order
router.post("/:orderId/cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Only customer or merchant can cancel
    if (order.customerId !== userId && order.merchantId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PREPARING'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    await storage.cancelOrder(orderId, {
      cancelledBy: userId,
      reason,
      refundAmount: order.paymentStatus === 'COMPLETED' ? order.totalAmount : '0'
    });

    res.json({
      success: true,
      message: "Order cancelled successfully"
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order"
    });
  }
});

// Get active orders (for drivers and merchants)
router.get("/active/list", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let activeOrders;

    switch (user.role) {
      case 'DRIVER':
        activeOrders = await storage.getDriverActiveOrders(userId);
        break;
      case 'MERCHANT':
        activeOrders = await storage.getMerchantActiveOrders(userId);
        break;
      default:
        activeOrders = await storage.getCustomerActiveOrders(userId);
    }

    res.json({
      success: true,
      orders: activeOrders
    });
  } catch (error) {
    console.error("Get active orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active orders"
    });
  }
});

// --- Delivery Feedback System ---
// Endpoint to submit feedback for a completed delivery
router.post("/:orderId/feedback", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { orderId } = req.params;
    const { rating, comment } = req.body;

    // Validate input
    const feedbackSchema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    });
    const validatedFeedback = feedbackSchema.parse({ rating, comment });

    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Ensure only the customer can provide feedback
    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the customer can provide feedback."
      });
    }

    // Ensure the order is completed
    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be provided for delivered orders."
      });
    }

    await storage.addDeliveryFeedback(orderId, {
      customerId: userId,
      driverId: order.driverId!,
      rating: validatedFeedback.rating,
      comment: validatedFeedback.comment,
      feedbackDate: new Date()
    });

    // Optionally, update driver's average rating
    await storage.updateDriverAverageRating(order.driverId!);

    // Emit real-time notification for feedback received
    if ((global as any).io) {
      (global as any).io.to(`user_${order.driverId}`).emit('delivery_feedback_received', {
        orderId,
        customerId: userId,
        rating: validatedFeedback.rating,
        timestamp: Date.now()
      });
    }

    res.status(201).json({
      success: true,
      message: "Delivery feedback submitted successfully."
    });
  } catch (error: any) {
    console.error("Submit delivery feedback error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback data",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to submit delivery feedback."
    });
  }
});

export default router;