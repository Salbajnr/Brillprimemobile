import express from "express";
import { db } from "../db";
import { transactions, orders, users } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Get payment history
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const paymentHistory = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    res.json({
      success: true,
      data: paymentHistory
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Initialize payment
router.post("/initialize", async (req, res) => {
  try {
    const userId = req.session?.userId || 1;
    const { amount, email, paymentMethod = "card" } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: 'Amount and email are required' });
    }

    // Create transaction record
    const [transaction] = await db.insert(transactions).values({
      userId,
      amount: amount.toString(),
      paymentMethod,
      paymentStatus: 'PENDING',
      transactionRef: `pay_${Date.now()}`,
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: {
        reference: transaction.transactionRef,
        authorizationUrl: `https://checkout.paystack.com/v2/checkout?reference=${transaction.transactionRef}`,
        transaction
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// Verify payment
router.post("/verify", async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // Find transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionRef, reference))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction status (mock verification for now)
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ paymentStatus: 'COMPLETED' })
      .where(eq(transactions.transactionRef, reference))
      .returning();

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;