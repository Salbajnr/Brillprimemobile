
import express from "express";
import { db } from "../db";
import { transactions, orders, users, wallets, escrowTransactions } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { transactionService } from "../services/transaction";
import { paystackService } from "../services/paystack";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";

const router = express.Router();

// Validation schemas
const paymentInitSchema = z.object({
  orderId: z.number().optional(),
  amount: z.number().positive(),
  email: z.string().email(),
  paymentMethod: z.string(),
  currency: z.string().default('NGN'),
  purpose: z.enum(['ORDER_PAYMENT', 'WALLET_FUNDING', 'TOLL_PAYMENT']).default('ORDER_PAYMENT'),
  metadata: z.object({}).optional()
});

const verifyPaymentSchema = z.object({
  reference: z.string(),
  orderId: z.number().optional()
});

const refundSchema = z.object({
  transactionId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string()
});

// Initialize payment
router.post("/initialize", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = paymentInitSchema.parse(req.body);

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Initialize payment with transaction service
    const result = await transactionService.initiatePayment({
      userId,
      amount: validatedData.amount,
      email: user.email,
      description: `${validatedData.purpose} - ${validatedData.amount} ${validatedData.currency}`,
      orderId: validatedData.orderId,
      metadata: {
        ...validatedData.metadata,
        purpose: validatedData.purpose,
        paymentMethod: validatedData.paymentMethod
      }
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        reference: result.reference,
        authorization_url: result.authorization_url,
        access_code: result.access_code
      }
    });

  } catch (error: any) {
    console.error("Payment initialization error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize payment"
    });
  }
});

// Verify payment
router.post("/verify", requireAuth, async (req, res) => {
  try {
    const { reference, orderId } = verifyPaymentSchema.parse(req.body);

    const result = await transactionService.verifyPayment(reference);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // If it's an order payment, update order status
    if (orderId && result.transaction.status === 'SUCCESS') {
      await db
        .update(orders)
        .set({
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }

    // Send real-time notification
    if (global.io && result.transaction) {
      global.io.to(`user_${result.transaction.userId}`).emit('payment_verified', {
        transactionId: result.transaction.id,
        status: result.transaction.status,
        amount: result.transaction.amount,
        reference,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      data: result.transaction
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment"
    });
  }
});

// Process refund
router.post("/refund", requireAuth, async (req, res) => {
  try {
    const { transactionId, amount, reason } = refundSchema.parse(req.body);

    const result = await transactionService.processRefund(transactionId, amount, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.refundTransaction,
      message: "Refund processed successfully"
    });

  } catch (error: any) {
    console.error("Refund processing error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process refund"
    });
  }
});

// Get transaction history
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [eq(transactions.userId, userId)];

    if (type) {
      whereConditions.push(eq(transactions.type, type as any));
    }

    if (status) {
      whereConditions.push(eq(transactions.status, status as any));
    }

    const userTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        status: transactions.status,
        amount: transactions.amount,
        netAmount: transactions.netAmount,
        currency: transactions.currency,
        description: transactions.description,
        paystackReference: transactions.paystackReference,
        orderId: transactions.orderId,
        createdAt: transactions.createdAt,
        completedAt: transactions.completedAt,
        metadata: transactions.metadata
      })
      .from(transactions)
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: {
        transactions: userTransactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: userTransactions.length === Number(limit)
        }
      }
    });

  } catch (error: any) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transactions"
    });
  }
});

// Get transaction receipt
router.get("/receipt/:transactionId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    const [transaction] = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        status: transactions.status,
        amount: transactions.amount,
        netAmount: transactions.netAmount,
        currency: transactions.currency,
        description: transactions.description,
        paystackReference: transactions.paystackReference,
        orderId: transactions.orderId,
        createdAt: transactions.createdAt,
        completedAt: transactions.completedAt,
        metadata: transactions.metadata,
        userName: users.fullName,
        userEmail: users.email
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      ))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    // Generate receipt data
    const receipt = {
      id: transaction.id,
      reference: transaction.paystackReference,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      date: transaction.createdAt,
      completedAt: transaction.completedAt,
      customer: {
        name: transaction.userName,
        email: transaction.userEmail
      },
      metadata: transaction.metadata
    };

    res.json({
      success: true,
      data: receipt
    });

  } catch (error: any) {
    console.error("Get receipt error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch receipt"
    });
  }
});

// Wallet funding
router.post("/wallet/fund", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Initialize wallet funding transaction
    const result = await transactionService.initiatePayment({
      userId,
      amount,
      email: user.email,
      description: `Wallet funding - ${amount} NGN`,
      metadata: {
        purpose: 'WALLET_FUNDING',
        userId
      }
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        reference: result.reference,
        authorization_url: result.authorization_url,
        access_code: result.access_code
      }
    });

  } catch (error: any) {
    console.error("Wallet funding error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate wallet funding"
    });
  }
});

// Wallet transfer
router.post("/wallet/transfer", requireAuth, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, amount, description } = req.body;

    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer parameters"
      });
    }

    const result = await transactionService.processWalletTransfer(
      fromUserId,
      toUserId,
      amount,
      description
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Send real-time notifications
    if (global.io) {
      global.io.to(`user_${fromUserId}`).emit('wallet_transfer_sent', {
        amount,
        toUserId,
        reference: result.transferRef,
        timestamp: Date.now()
      });

      global.io.to(`user_${toUserId}`).emit('wallet_transfer_received', {
        amount,
        fromUserId,
        reference: result.transferRef,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      data: result.transaction,
      message: "Transfer completed successfully"
    });

  } catch (error: any) {
    console.error("Wallet transfer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process transfer"
    });
  }
});

// Paystack webhook handler
router.post("/paystack/webhook", async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ message: "Missing signature" });
    }

    // Validate webhook signature
    const isValid = paystackService.validateWebhook(signature, JSON.stringify(req.body));
    
    if (!isValid) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const { event, data } = req.body;

    switch (event) {
      case 'charge.success':
        await handleSuccessfulPayment(data);
        break;
      case 'charge.failed':
        await handleFailedPayment(data);
        break;
      case 'transfer.success':
        await handleSuccessfulTransfer(data);
        break;
      case 'transfer.failed':
        await handleFailedTransfer(data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// Get Paystack configuration
router.get("/config/paystack", async (req, res) => {
  try {
    const config = paystackService.getConfig();
    
    res.json({
      success: true,
      data: {
        publicKey: config.publicKey,
        isConfigured: paystackService.isConfigured()
      }
    });
  } catch (error: any) {
    console.error("Get Paystack config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment configuration"
    });
  }
});

// Helper functions for webhook handling
async function handleSuccessfulPayment(data: any) {
  try {
    const reference = data.reference;
    await transactionService.verifyPayment(reference);
  } catch (error) {
    console.error("Handle successful payment error:", error);
  }
}

async function handleFailedPayment(data: any) {
  try {
    const reference = data.reference;
    
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.paystackReference, reference))
      .limit(1);

    if (transaction) {
      await db
        .update(transactions)
        .set({
          status: 'FAILED',
          failedAt: new Date(),
          gatewayResponse: data
        })
        .where(eq(transactions.id, transaction.id));
    }
  } catch (error) {
    console.error("Handle failed payment error:", error);
  }
}

async function handleSuccessfulTransfer(data: any) {
  try {
    // Handle successful transfer logic
    console.log("Transfer successful:", data);
  } catch (error) {
    console.error("Handle successful transfer error:", error);
  }
}

async function handleFailedTransfer(data: any) {
  try {
    // Handle failed transfer logic
    console.log("Transfer failed:", data);
  } catch (error) {
    console.error("Handle failed transfer error:", error);
  }
}

export default router;
