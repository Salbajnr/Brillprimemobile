
import { Router } from 'express';
import { db } from '../db';
import { orders, users } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';

const router = Router();

// Get active orders for real-time tracking
router.get('/active', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user role to determine which orders to show
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let activeOrders;

    // Filter orders based on user role
    if (user.role === 'DRIVER') {
      activeOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.driverId, userId),
          or(
            eq(orders.status, 'CONFIRMED'),
            eq(orders.status, 'IN_PROGRESS')
          )
        ));
    } else if (user.role === 'CONSUMER') {
      activeOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.customerId, userId),
          or(
            eq(orders.status, 'PENDING'),
            eq(orders.status, 'CONFIRMED'),
            eq(orders.status, 'IN_PROGRESS')
          )
        ));
    } else if (user.role === 'MERCHANT') {
      activeOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.merchantId, userId),
          or(
            eq(orders.status, 'PENDING'),
            eq(orders.status, 'CONFIRMED'),
            eq(orders.status, 'IN_PROGRESS')
          )
        ));
    } else {
      activeOrders = [];
    }

    // Format orders for frontend
    const formattedOrders = activeOrders.map(order => ({
      id: order.orderNumber,
      status: order.status,
      driverName: order.driverId ? 'Driver Assigned' : 'Pending Assignment',
      estimatedArrival: order.updatedAt.toISOString(),
      completionPercentage: getCompletionPercentage(order.status)
    }));

    res.json({
      success: true,
      orders: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active orders'
    });
  }
});

function getCompletionPercentage(status: string): number {
  switch (status) {
    case 'PENDING': return 10;
    case 'CONFIRMED': return 30;
    case 'IN_PROGRESS': return 65;
    case 'DELIVERED': return 100;
    default: return 0;
  }
}

export default router;
