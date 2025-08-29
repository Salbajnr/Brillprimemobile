
import express from "express";
import { db } from "../db";
import { transactions, orders, users } from "../../shared/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";

const router = express.Router();

// Create escrow transaction
router.post("/create", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { orderId, amount, description } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and amount are required'
      });
    }

    // Verify the order exists and user is authorized
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create escrow for this order'
      });
    }

    // Check if escrow already exists for this order
    const [existingEscrow] = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.orderId, orderId),
        eq(transactions.type, 'PAYMENT'),
        eq(transactions.paymentMethod, 'escrow')
      ))
      .limit(1);

    if (existingEscrow) {
      return res.status(400).json({
        success: false,
        error: 'Escrow already exists for this order'
      });
    }

    const [escrowTransaction] = await db.insert(transactions).values({
      userId,
      orderId,
      amount: amount.toString(),
      currency: 'NGN',
      type: 'PAYMENT',
      status: 'PENDING',
      paymentMethod: 'escrow',
      paymentStatus: 'PENDING',
      transactionRef: `ESC_${Date.now()}`,
      description: description || `Escrow payment for order ${order.orderNumber}`,
      initiatedAt: new Date(),
      createdAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      data: escrowTransaction
    });
  } catch (error) {
    console.error('Escrow creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create escrow' });
  }
});

// Release escrow funds (admin or system)
router.post("/release/:transactionId", requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;
    const { recipientId, releaseAmount } = req.body;

    // Verify admin or authorized user
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can release escrow funds'
      });
    }

    const [escrowTransaction] = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.id, parseInt(transactionId)),
        eq(transactions.paymentMethod, 'escrow'),
        eq(transactions.paymentStatus, 'PENDING')
      ))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Escrow transaction not found or already processed'
      });
    }

    const amountToRelease = releaseAmount || escrowTransaction.amount;

    // Update escrow transaction to completed
    await db
      .update(transactions)
      .set({
        paymentStatus: 'COMPLETED',
        status: 'COMPLETED',
        completedAt: new Date()
      })
      .where(eq(transactions.id, parseInt(transactionId)));

    // Create transfer transaction to recipient
    const [transferTransaction] = await db.insert(transactions).values({
      userId: recipientId,
      orderId: escrowTransaction.orderId,
      amount: amountToRelease,
      currency: 'NGN',
      type: 'TRANSFER_IN',
      status: 'COMPLETED',
      paymentMethod: 'escrow_release',
      paymentStatus: 'COMPLETED',
      transactionRef: `REL_${Date.now()}`,
      description: `Escrow release from transaction ${escrowTransaction.transactionRef}`,
      initiatedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: {
        escrowTransaction: escrowTransaction,
        transferTransaction: transferTransaction
      }
    });
  } catch (error) {
    console.error('Escrow release error:', error);
    res.status(500).json({ success: false, error: 'Failed to release escrow' });
  }
});

// Refund escrow (admin only)
router.post("/refund/:transactionId", requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userRole = req.session?.user?.role;
    const { refundReason } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can refund escrow'
      });
    }

    const [escrowTransaction] = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.id, parseInt(transactionId)),
        eq(transactions.paymentMethod, 'escrow'),
        eq(transactions.paymentStatus, 'PENDING')
      ))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Escrow transaction not found or already processed'
      });
    }

    // Update escrow transaction to refunded
    await db
      .update(transactions)
      .set({
        paymentStatus: 'REFUNDED',
        status: 'REFUNDED',
        completedAt: new Date()
      })
      .where(eq(transactions.id, parseInt(transactionId)));

    // Create refund transaction
    const [refundTransaction] = await db.insert(transactions).values({
      userId: escrowTransaction.userId,
      orderId: escrowTransaction.orderId,
      amount: escrowTransaction.amount,
      currency: 'NGN',
      type: 'REFUND',
      status: 'COMPLETED',
      paymentMethod: 'escrow_refund',
      paymentStatus: 'COMPLETED',
      transactionRef: `REF_${Date.now()}`,
      description: `Escrow refund: ${refundReason || 'No reason provided'}`,
      initiatedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: {
        escrowTransaction: escrowTransaction,
        refundTransaction: refundTransaction
      }
    });
  } catch (error) {
    console.error('Escrow refund error:', error);
    res.status(500).json({ success: false, error: 'Failed to refund escrow' });
  }
});

// Get escrow transactions
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;
    const { status, orderId } = req.query;

    let whereConditions = [eq(transactions.paymentMethod, 'escrow')];

    // Non-admin users can only see their own escrow transactions
    if (userRole !== 'ADMIN') {
      whereConditions.push(eq(transactions.userId, userId));
    }

    if (status) {
      whereConditions.push(eq(transactions.paymentStatus, status as string));
    }

    if (orderId) {
      whereConditions.push(eq(transactions.orderId, parseInt(orderId as string)));
    }

    const escrowTransactions = await db
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        paymentStatus: transactions.paymentStatus,
        transactionRef: transactions.transactionRef,
        description: transactions.description,
        initiatedAt: transactions.initiatedAt,
        completedAt: transactions.completedAt,
        userName: users.fullName,
        userEmail: users.email
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt));

    res.json({
      success: true,
      data: escrowTransactions
    });
  } catch (error) {
    console.error('Escrow transactions fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch escrow transactions' });
  }
});

// Get escrow transaction by ID
router.get("/transactions/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    let whereConditions = [
      eq(transactions.id, parseInt(id)),
      eq(transactions.paymentMethod, 'escrow')
    ];

    // Non-admin users can only see their own escrow transactions
    if (userRole !== 'ADMIN') {
      whereConditions.push(eq(transactions.userId, userId));
    }

    const [escrowTransaction] = await db
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        paymentStatus: transactions.paymentStatus,
        transactionRef: transactions.transactionRef,
        description: transactions.description,
        metadata: transactions.metadata,
        initiatedAt: transactions.initiatedAt,
        completedAt: transactions.completedAt,
        createdAt: transactions.createdAt,
        userName: users.fullName,
        userEmail: users.email,
        orderNumber: orders.orderNumber
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .where(and(...whereConditions))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Escrow transaction not found'
      });
    }

    res.json({
      success: true,
      data: escrowTransaction
    });
  } catch (error) {
    console.error('Escrow transaction fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch escrow transaction' });
  }
});

export default router;
