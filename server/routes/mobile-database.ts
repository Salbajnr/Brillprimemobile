
import express from 'express';
import { db } from '../db';
import { users, orders, transactions, products } from '../../shared/schema';
import { eq, count } from 'drizzle-orm';

const router = express.Router();

// Mobile database integration verification
router.get('/mobile/database-status', async (req, res) => {
  try {
    // Verify we can access the same database tables as web app
    const [userCount] = await db.select({ count: count() }).from(users);
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [transactionCount] = await db.select({ count: count() }).from(transactions);
    const [productCount] = await db.select({ count: count() }).from(products);

    const dbStatus = {
      connected: true,
      sharedWithWebApp: true,
      tables: {
        users: userCount.count,
        orders: orderCount.count,
        transactions: transactionCount.count,
        products: productCount.count
      },
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: dbStatus
    });
  } catch (error) {
    console.error('Mobile database status error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      connected: false
    });
  }
});

// Test mobile data synchronization with web app
router.get('/mobile/sync-test', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify user data is accessible from both platforms
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in shared database'
      });
    }

    // Get user's orders and transactions to verify data consistency
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, user.id))
      .limit(10);

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .limit(10);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        dataConsistency: {
          orders: userOrders.length,
          transactions: userTransactions.length,
          lastSync: new Date().toISOString()
        },
        sharedDatabase: true
      }
    });
  } catch (error) {
    console.error('Mobile sync test error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync test failed'
    });
  }
});

export default router;
