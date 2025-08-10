
import express from "express";
import { db, dbOperations } from "../db";
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

const walletFundSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string()
});

// Initialize payment transaction
router.post("/payments/initialize", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const validatedData = paymentInitSchema.parse(req.body);

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const paymentData = {
      userId,
      amount: validatedData.amount,
      email: user.email,
      description: `${validatedData.purpose.replace('_', ' ')} - ${validatedData.amount} ${validatedData.currency}`,
      orderId: validatedData.orderId?.toString(),
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      metadata: {
        ...validatedData.metadata,
        userId,
        purpose: validatedData.purpose,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    };

    const result = await transactionService.initiatePayment(paymentData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Payment initialization failed"
      });
    }

    res.json({
      success: true,
      transactionId: result.transactionId,
      reference: result.reference,
      authorization_url: result.authorization_url,
      access_code: result.access_code
    });

  } catch (error: any) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ 
      success: false,
      message: error.message || "Payment initialization failed" 
    });
  }
});

// Verify payment transaction
router.get("/payments/verify/:reference", requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.session!.userId!;

    const result = await transactionService.verifyPayment(reference);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Payment verification failed"
      });
    }

    // Check if user owns this transaction
    if (result.transaction?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      transaction: result.transaction,
      verified: result.success
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed"
    });
  }
});

// Paystack webhook handler
router.post("/payments/paystack/webhook", async (req, res) => {
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

// Handle successful payment
async function handleSuccessfulPayment(data: any) {
  try {
    const reference = data.reference;
    
    // Update transaction status
    const [transaction] = await db
      .update(transactions)
      .set({
        status: 'SUCCESS',
        completedAt: new Date(),
        gatewayResponse: data
      })
      .where(eq(transactions.paystackReference, reference))
      .returning();

    if (transaction) {
      // Handle based on transaction type
      if (transaction.type === 'DEPOSIT') {
        // Update wallet balance
        const [wallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.userId, transaction.userId));

        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount);
          await db
            .update(wallets)
            .set({
              balance: newBalance.toString(),
              lastUpdated: new Date()
            })
            .where(eq(wallets.id, wallet.id));
        }
      } else if (transaction.orderId) {
        // Update order status
        await db
          .update(orders)
          .set({
            status: 'CONFIRMED',
            updatedAt: new Date()
          })
          .where(eq(orders.id, parseInt(transaction.orderId)));
      }

      // Send real-time notification
      if (global.io) {
        global.io.to(`user_${transaction.userId}`).emit('payment_success', {
          transactionId: transaction.id,
          amount: transaction.amount,
          reference,
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

// Handle failed payment
async function handleFailedPayment(data: any) {
  try {
    const reference = data.reference;
    
    await db
      .update(transactions)
      .set({
        status: 'FAILED',
        failedAt: new Date(),
        gatewayResponse: data
      })
      .where(eq(transactions.paystackReference, reference));

    // Send real-time notification
    if (global.io) {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.paystackReference, reference))
        .limit(1);

      if (transaction) {
        global.io.to(`user_${transaction.userId}`).emit('payment_failed', {
          transactionId: transaction.id,
          reference,
          reason: data.gateway_response,
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

// Handle successful transfer
async function handleSuccessfulTransfer(data: any) {
  // Implementation for transfer success
  console.log('Transfer successful:', data);
}

// Handle failed transfer
async function handleFailedTransfer(data: any) {
  // Implementation for transfer failure
  console.log('Transfer failed:', data);
}

// Fund wallet
router.post("/wallet/fund", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { amount, paymentMethod } = walletFundSchema.parse(req.body);

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await transactionService.initiatePayment({
      userId,
      amount,
      email: user.email,
      description: `Wallet funding - ₦${amount}`,
      metadata: {
        purpose: 'WALLET_FUNDING',
        paymentMethod,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Wallet funding failed"
      });
    }

    res.json({
      success: true,
      transactionId: result.transactionId,
      reference: result.reference,
      authorization_url: result.authorization_url
    });

  } catch (error: any) {
    console.error("Wallet funding error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Wallet funding failed"
    });
  }
});

// Get user transactions
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { page = 1, limit = 20, type, status } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        description: transactions.description,
        paystackReference: transactions.paystackReference,
        createdAt: transactions.createdAt,
        completedAt: transactions.completedAt,
        orderId: transactions.orderId
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    const userTransactions = await query;

    res.json({
      success: true,
      data: userTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        hasMore: userTransactions.length === Number(limit)
      }
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch transactions" 
    });
  }
});

// Get transaction by ID
router.get("/transactions/:transactionId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { transactionId } = req.params;

    const [transaction] = await db
      .select()
      .from(transactions)
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

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch transaction" 
    });
  }
});

// Wallet transfer
router.post("/wallet/transfer", requireAuth, async (req, res) => {
  try {
    const fromUserId = req.session!.userId!;
    const { toUserId, amount, description } = req.body;

    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer details"
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
        transferRef: result.transferRef,
        timestamp: Date.now()
      });

      global.io.to(`user_${toUserId}`).emit('wallet_transfer_received', {
        amount,
        fromUserId,
        transferRef: result.transferRef,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Transfer completed successfully",
      data: result.transaction
    });

  } catch (error: any) {
    console.error("Wallet transfer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Transfer failed"
    });
  }
});

// Get wallet balance
router.get("/wallet/balance", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!wallet) {
      // Create wallet if it doesn't exist
      const [newWallet] = await db
        .insert(wallets)
        .values({
          userId,
          balance: "0.00",
          currency: "NGN"
        })
        .returning();

      return res.json({
        success: true,
        data: {
          balance: "0.00",
          currency: "NGN",
          lastUpdated: newWallet.createdAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        lastUpdated: wallet.lastUpdated || wallet.createdAt
      }
    });

  } catch (error: any) {
    console.error("Get wallet balance error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch wallet balance"
    });
  }
});

// Process refund
router.post("/payments/refund", requireAuth, async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required"
      });
    }

    const result = await transactionService.processRefund(transactionId, amount, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: "Refund processed successfully",
      data: result.refundTransaction
    });

  } catch (error: any) {
    console.error("Refund processing error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Refund processing failed"
    });
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

export default router;
