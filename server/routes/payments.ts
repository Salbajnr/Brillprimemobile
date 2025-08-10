
import express from "express";
import { db, dbOperations } from "../db";
import { transactions, orders, users } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";

const router = express.Router();

// Create payment transaction
router.post("/payments", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderId, amount, paymentMethod, currency = 'NGN' } = req.body;

    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create transaction record
    const transaction = await dbOperations.createTransaction({
      orderId: parseInt(orderId),
      userId: req.session.userId,
      amount: amount.toString(),
      currency,
      paymentMethod,
      paymentStatus: 'PENDING',
      metadata: { 
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date()
      }
    });

    // In a real implementation, you would integrate with payment provider here
    // For now, we'll simulate payment processing
    setTimeout(async () => {
      try {
        await db
          .update(transactions)
          .set({
            paymentStatus: 'COMPLETED',
            paymentGatewayRef: `pay_${Date.now()}`
          })
          .where(eq(transactions.id, transaction.id));

        // Update order payment status
        await db
          .update(orders)
          .set({ 
            status: 'CONFIRMED',
            updatedAt: new Date()
          })
          .where(eq(orders.id, parseInt(orderId)));

      } catch (error) {
        console.error('Payment processing error:', error);
      }
    }, 2000);

    res.json({ 
      id: transaction.transactionRef,
      status: "processing",
      amount: transaction.amount,
      currency: transaction.currency,
      transactionId: transaction.id
    });

  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ message: "Payment processing failed" });
  }
});

// Get user transactions
router.get("/transactions", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userTransactions = await dbOperations.getTransactionsByUserId(req.session.userId);

    const formattedTransactions = userTransactions.map(tx => ({
      id: tx.id,
      transactionRef: tx.transactionRef,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      paymentMethod: tx.paymentMethod,
      status: tx.paymentStatus.toLowerCase(),
      date: tx.createdAt,
      orderId: tx.orderId
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// Get transaction by ID
router.get("/transactions/:transactionId", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { transactionId } = req.params;

    const transaction = await db
      .select({
        id: transactions.id,
        transactionRef: transactions.transactionRef,
        amount: transactions.amount,
        currency: transactions.currency,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        paymentGatewayRef: transactions.paymentGatewayRef,
        createdAt: transactions.createdAt,
        orderId: transactions.orderId,
        orderNumber: orders.orderNumber
      })
      .from(transactions)
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .where(and(
        eq(transactions.id, parseInt(transactionId)),
        eq(transactions.userId, req.session.userId)
      ))
      .limit(1);

    if (!transaction.length) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction[0]);
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ message: "Failed to fetch transaction" });
  }
});

// Payment method management (simplified for now)
router.post("/payment-methods", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // In a real implementation, this would store payment method securely
  res.json({ 
    id: `pm_${Date.now()}`,
    message: "Payment method added successfully" 
  });
});

router.get("/payment-methods", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Mock payment methods for now - in production, fetch from secure vault
  res.json([
    { id: "pm_1", type: "card", last4: "1234", brand: "visa", isDefault: true },
    { id: "pm_2", type: "bank", name: "Access Bank", isDefault: false }
  ]);
});

export default router;
