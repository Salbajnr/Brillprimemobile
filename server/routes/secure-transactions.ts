import express from 'express';
import { db } from '../db';
import { transactions, users, orders, wallets } from '../../shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Process payment transaction
router.post('/process', requireAuth, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, currency = 'NGN' } = req.body;
    const userId = req.user.id;

    // Validate order exists and belongs to user
    const order = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
      .limit(1);

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Create transaction record
    const transaction = await db.insert(transactions).values({
      orderId,
      userId,
      amount: amount.toString(),
      currency,
      paymentMethod,
      paymentStatus: 'PENDING',
      transactionRef: `TX_${Date.now()}_${userId}`,
      metadata: {
        orderId,
        paymentMethod,
        initiatedAt: new Date().toISOString()
      }
    }).returning();

    // Update order payment status
    await db.update(orders).set({
      paymentStatus: 'PENDING'
    }).where(eq(orders.id, orderId));

    res.json({
      success: true,
      data: {
        transaction: transaction[0],
        paymentUrl: `${process.env.BASE_URL}/payment/confirm/${transaction[0].id}`
      }
    });
  } catch (error) {
    console.error('Transaction processing error:', error);
    res.status(500).json({ success: false, message: 'Failed to process transaction' });
  }
});

// Confirm payment
router.post('/confirm/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { gatewayResponse } = req.body;

    const transaction = await db.select().from(transactions)
      .where(eq(transactions.id, parseInt(transactionId)))
      .limit(1);

    if (transaction.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Update transaction status
    await db.update(transactions).set({
      paymentStatus: 'COMPLETED',
      paymentGatewayRef: gatewayResponse?.reference,
      metadata: {
        ...transaction[0].metadata as any,
        completedAt: new Date().toISOString(),
        gatewayResponse
      }
    }).where(eq(transactions.id, parseInt(transactionId)));

    // Update order status
    if (transaction[0].orderId) {
      await db.update(orders).set({
        paymentStatus: 'COMPLETED',
        status: 'CONFIRMED'
      }).where(eq(orders.id, transaction[0].orderId));
    }

    // Update wallet balance if applicable
    if (transaction[0].userId) {
      const wallet = await db.select().from(wallets)
        .where(eq(wallets.userId, transaction[0].userId))
        .limit(1);

      if (wallet.length > 0) {
        await db.update(wallets).set({
          balance: (parseFloat(wallet[0].balance) + parseFloat(transaction[0].amount)).toString()
        }).where(eq(wallets.userId, transaction[0].userId));
      }
    }

    res.json({
      success: true,
      data: { transactionId, status: 'COMPLETED' }
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
});

// Get transaction history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions = [eq(transactions.userId, userId)];

    if (status) {
      whereConditions.push(eq(transactions.paymentStatus, status as any));
    }

    if (startDate) {
      whereConditions.push(gte(transactions.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(transactions.createdAt, new Date(endDate as string)));
    }

    const userTransactions = await db.select({
      id: transactions.id,
      amount: transactions.amount,
      currency: transactions.currency,
      paymentMethod: transactions.paymentMethod,
      paymentStatus: transactions.paymentStatus,
      transactionRef: transactions.transactionRef,
      createdAt: transactions.createdAt,
      order: {
        orderNumber: orders.orderNumber,
        orderType: orders.orderType
      }
    })
    .from(transactions)
    .leftJoin(orders, eq(transactions.orderId, orders.id))
    .where(and(...whereConditions))
    .orderBy(desc(transactions.createdAt))
    .limit(parseInt(limit as string))
    .offset(offset);

    res.json({
      success: true,
      data: {
        transactions: userTransactions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: userTransactions.length
        }
      }
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transaction history' });
  }
});

export default router;