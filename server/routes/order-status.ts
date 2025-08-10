import express from 'express';
import { db } from '../db';
import { orders, users, products, fuelOrders, transactions } from '../../shared/schema';
import { eq, desc, and, or, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Create new order
router.post('/create', requireAuth, async (req, res) => {
  try {
    const {
      orderType, // 'PRODUCT', 'FUEL', 'COMMODITY'
      items, // Array of items for product orders
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      urgentOrder = false,
      notes
    } = req.body;

    const customerId = req.user.id;

    let totalAmount = 0;
    let orderData: any = {};

    if (orderType === 'PRODUCT' && items) {
      // Calculate total for product orders
      for (const item of items) {
        const product = await db.select().from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product.length > 0) {
          totalAmount += parseFloat(product[0].price) * item.quantity;
        }
      }
      orderData = { items };
    }

    const order = await db.insert(orders).values({
      orderNumber: `ORD${Date.now()}${customerId}`,
      customerId,
      orderType,
      status: 'PENDING',
      totalAmount: totalAmount.toString(),
      deliveryAddress,
      deliveryLatitude: deliveryLatitude?.toString(),
      deliveryLongitude: deliveryLongitude?.toString(),
      orderData,
      urgentOrder,
      notes,
      paymentStatus: 'PENDING',
      estimatedPreparationTime: urgentOrder ? 15 : 30
    }).returning();

    // Create transaction for payment
    await db.insert(transactions).values({
      orderId: order[0].id,
      userId: customerId,
      amount: totalAmount.toString(),
      currency: 'NGN',
      paymentMethod: 'pending',
      paymentStatus: 'PENDING',
      transactionRef: `ORD_${order[0].id}_${Date.now()}`,
      metadata: {
        orderId: order[0].id,
        orderType,
        urgentOrder
      }
    });

    res.json({
      success: true,
      data: {
        order: order[0],
        message: 'Order created successfully'
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Update order status
router.patch('/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;
    const userId = req.user.id;

    const order = await db.select().from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization - customer, merchant, or driver can update
    const canUpdate = order[0].customerId === userId || 
                     order[0].merchantId === userId || 
                     order[0].driverId === userId;

    if (!canUpdate) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this order' });
    }

    const updateData: any = { status, updatedAt: new Date() };

    // Handle specific status transitions
    switch (status) {
      case 'CONFIRMED':
        if (order[0].paymentStatus !== 'COMPLETED') {
          return res.status(400).json({ 
            success: false, 
            message: 'Cannot confirm order without completed payment' 
          });
        }
        break;
      case 'CANCELLED':
        updateData.notes = reason || 'Order cancelled';
        // Handle refund logic here if needed
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
    }

    await db.update(orders).set(updateData)
      .where(eq(orders.id, parseInt(orderId)));

    // Emit real-time update
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to(`order_${orderId}`).emit('status_update', {
        orderId: parseInt(orderId),
        status,
        updatedBy: userId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Get order details
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const orderDetails = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      merchantId: orders.merchantId,
      driverId: orders.driverId,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      deliveryAddress: orders.deliveryAddress,
      orderData: orders.orderData,
      urgentOrder: orders.urgentOrder,
      notes: orders.notes,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customer: {
        fullName: users.fullName,
        phone: users.phone,
        email: users.email
      }
    })
    .from(orders)
    .leftJoin(users, eq(orders.customerId, users.id))
    .where(eq(orders.id, parseInt(orderId)))
    .limit(1);

    if (orderDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderDetails[0];

    // Check if user can view this order
    const canView = order.customerId === userId || 
                   order.merchantId === userId || 
                   order.driverId === userId;

    if (!canView) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this order' });
    }

    // Get related transactions
    const orderTransactions = await db.select().from(transactions)
      .where(eq(transactions.orderId, parseInt(orderId)))
      .orderBy(desc(transactions.createdAt));

    res.json({
      success: true,
      data: {
        order,
        transactions: orderTransactions
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get order details' });
  }
});

// Get user's orders
router.get('/user/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      status, 
      orderType, 
      page = 1, 
      limit = 20,
      role = 'customer' // customer, merchant, driver
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions = [];

    // Filter by user role
    switch (role) {
      case 'customer':
        whereConditions.push(eq(orders.customerId, userId));
        break;
      case 'merchant':
        whereConditions.push(eq(orders.merchantId, userId));
        break;
      case 'driver':
        whereConditions.push(eq(orders.driverId, userId));
        break;
    }

    if (status) {
      whereConditions.push(eq(orders.status, status as any));
    }

    if (orderType) {
      whereConditions.push(eq(orders.orderType, orderType as string));
    }

    const userOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      deliveryAddress: orders.deliveryAddress,
      urgentOrder: orders.urgentOrder,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      customer: {
        fullName: users.fullName,
        phone: users.phone
      }
    })
    .from(orders)
    .leftJoin(users, eq(orders.customerId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(orders.createdAt))
    .limit(parseInt(limit as string))
    .offset(offset);

    res.json({
      success: true,
      data: {
        orders: userOrders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: userOrders.length
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
});

// Assign driver to order
router.post('/:orderId/assign-driver', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    const userId = req.user.id;

    const order = await db.select().from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only merchant or admin can assign drivers
    if (order[0].merchantId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to assign driver' });
    }

    await db.update(orders).set({
      driverId: parseInt(driverId),
      status: 'IN_PROGRESS',
      updatedAt: new Date()
    }).where(eq(orders.id, parseInt(orderId)));

    res.json({
      success: true,
      message: 'Driver assigned successfully'
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign driver' });
  }
});

export default router;