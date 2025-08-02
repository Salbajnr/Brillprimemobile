import type { Express } from "express";
import { transactionService } from "../services/transaction";
import { paystackService } from "../services/paystack";
import { storage } from "../storage";
import { z } from "zod";

// Validation schemas
const initiatePaymentSchema = z.object({
  amount: z.number().min(100, "Minimum amount is ₦100"),
  email: z.string().email(),
  description: z.string().optional(),
  orderId: z.string().optional(),
  channels: z.array(z.string()).optional(),
  split: z.object({
    sellerId: z.number(),
    driverId: z.number().optional(),
    sellerShare: z.number(),
    driverShare: z.number().optional(),
    platformFee: z.number()
  }).optional()
});

const chargePaymentMethodSchema = z.object({
  paymentMethodId: z.number(),
  amount: z.number().min(100),
  email: z.string().email(),
  description: z.string().optional()
});

const transferSchema = z.object({
  recipientId: z.number(),
  amount: z.number().min(100),
  description: z.string().optional()
});

export function registerPaymentRoutes(app: Express) {
  // Get user wallet
  app.get("/api/wallet", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let wallet = await storage.getUserWallet(req.session.userId);
      if (!wallet) {
        wallet = await storage.createWallet(req.session.userId);
      }

      res.json(wallet);
    } catch (error) {
      console.error("Get wallet error:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Get payment methods
  app.get("/api/payment-methods", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const paymentMethods = await storage.getUserPaymentMethods(req.session.userId);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Get user transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { limit = 50, offset = 0 } = req.query;
      const transactions = await storage.getUserTransactions(
        req.session.userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Initiate payment
  app.post("/api/payments/initiate", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = initiatePaymentSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const result = await transactionService.initiatePayment({
        userId: req.session.userId,
        amount: validatedData.amount,
        email: validatedData.email || user.email,
        description: validatedData.description,
        orderId: validatedData.orderId,
        channels: validatedData.channels,
        split: validatedData.split,
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: error.message || "Payment initiation failed" 
      });
    }
  });

  // Verify payment
  app.post("/api/payments/verify", async (req, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Transaction reference is required" });
      }

      const result = await transactionService.verifyPayment(reference);
      
      // Emit real-time update via WebSocket
      if (result.success && req.app.get('io')) {
        const io = req.app.get('io');
        const transaction = result.transaction;
        
        // Notify the user
        io.to(`user_${transaction.userId}`).emit('payment_update', {
          type: 'PAYMENT_SUCCESS',
          transaction: transaction,
          message: 'Payment completed successfully'
        });

        // Notify other parties if it's an order payment
        if (transaction.orderId) {
          io.to(`order_${transaction.orderId}`).emit('payment_update', {
            type: 'ORDER_PAYMENT_RECEIVED',
            transaction: transaction,
            orderId: transaction.orderId
          });
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ 
        message: error.message || "Payment verification failed" 
      });
    }
  });

  // Charge saved payment method
  app.post("/api/payments/charge", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = chargePaymentMethodSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const result = await transactionService.chargePaymentMethod({
        userId: req.session.userId,
        paymentMethodId: validatedData.paymentMethodId,
        amount: validatedData.amount,
        email: validatedData.email || user.email,
        description: validatedData.description,
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Payment charge error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: error.message || "Payment charge failed" 
      });
    }
  });

  // Transfer funds between users
  app.post("/api/payments/transfer", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = transferSchema.parse(req.body);
      
      // Check sender's wallet balance
      const senderWallet = await storage.getUserWallet(req.session.userId);
      if (!senderWallet || parseFloat(senderWallet.balance) < validatedData.amount) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      // Check recipient exists
      const recipient = await storage.getUser(validatedData.recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      // Process transfer
      await transactionService.updateWalletBalance(req.session.userId, validatedData.amount, 'subtract');
      await transactionService.updateWalletBalance(validatedData.recipientId, validatedData.amount, 'add');

      // Create transaction records
      const senderTransaction = await storage.createTransaction({
        userId: req.session.userId,
        recipientId: validatedData.recipientId,
        type: 'TRANSFER',
        status: 'SUCCESS',
        amount: validatedData.amount.toString(),
        fee: "0.00",
        netAmount: validatedData.amount.toString(),
        description: validatedData.description || `Transfer to ${recipient.fullName}`,
        completedAt: new Date()
      });

      const recipientTransaction = await storage.createTransaction({
        userId: validatedData.recipientId,
        recipientId: req.session.userId,
        type: 'TRANSFER',
        status: 'SUCCESS',
        amount: validatedData.amount.toString(),
        fee: "0.00",
        netAmount: validatedData.amount.toString(),
        description: validatedData.description || `Transfer from ${req.session.user?.fullName}`,
        completedAt: new Date()
      });

      // Real-time notifications
      if (req.app.get('io')) {
        const io = req.app.get('io');
        
        io.to(`user_${req.session.userId}`).emit('wallet_update', {
          type: 'TRANSFER_SENT',
          amount: validatedData.amount,
          recipient: recipient.fullName,
          transaction: senderTransaction
        });

        io.to(`user_${validatedData.recipientId}`).emit('wallet_update', {
          type: 'TRANSFER_RECEIVED',
          amount: validatedData.amount,
          sender: req.session.user?.fullName,
          transaction: recipientTransaction
        });
      }

      res.json({
        success: true,
        message: "Transfer completed successfully",
        transaction: senderTransaction
      });

    } catch (error: any) {
      console.error("Transfer error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: error.message || "Transfer failed" 
      });
    }
  });

  // Get transaction analytics
  app.get("/api/payments/analytics", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { period = 'monthly' } = req.query;
      const analytics = await transactionService.getTransactionAnalytics(
        req.session.userId,
        period as 'daily' | 'weekly' | 'monthly'
      );

      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Paystack webhook
  app.post("/api/payments/paystack/webhook", async (req, res) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      
      if (!paystackService.validateWebhook(signature, req.body)) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }

      const event = req.body;
      console.log('Paystack webhook received:', event.event);

      switch (event.event) {
        case 'charge.success':
          await handleChargeSuccess(event.data, req.app);
          break;
        case 'charge.failed':
          await handleChargeFailed(event.data, req.app);
          break;
        case 'transfer.success':
          await handleTransferSuccess(event.data, req.app);
          break;
        case 'transfer.failed':
          await handleTransferFailed(event.data, req.app);
          break;
        default:
          console.log('Unhandled webhook event:', event.event);
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Get banks for transfers
  app.get("/api/payments/banks", async (req, res) => {
    try {
      const result = await paystackService.getBanks();
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Get banks error:", error);
      res.status(500).json({ message: "Failed to fetch banks" });
    }
  });

  // Resolve account number
  app.post("/api/payments/resolve-account", async (req, res) => {
    try {
      const { accountNumber, bankCode } = req.body;
      
      if (!accountNumber || !bankCode) {
        return res.status(400).json({ message: "Account number and bank code are required" });
      }

      const result = await paystackService.resolveAccountNumber(accountNumber, bankCode);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Account resolution error:", error);
      res.status(500).json({ message: "Account resolution failed" });
    }
  });

  // Release escrow funds (admin/automatic)
  app.post("/api/payments/escrow/:escrowId/release", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { escrowId } = req.params;
      const { releaseCondition } = req.body;

      const result = await transactionService.releaseEscrow(
        parseInt(escrowId),
        releaseCondition,
        req.session.userId
      );

      // Real-time notification
      if (req.app.get('io')) {
        const io = req.app.get('io');
        io.emit('escrow_released', {
          escrowId: parseInt(escrowId),
          releaseCondition,
          releasedBy: req.session.userId
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Escrow release error:", error);
      res.status(500).json({ 
        message: error.message || "Escrow release failed" 
      });
    }
  });
}

// Webhook event handlers
async function handleChargeSuccess(data: any, app: any) {
  try {
    const reference = data.reference;
    await transactionService.verifyPayment(reference);
    
    // Emit real-time update
    if (app.get('io')) {
      const io = app.get('io');
      const transaction = await storage.getTransactionByReference(reference);
      
      if (transaction) {
        io.to(`user_${transaction.userId}`).emit('payment_update', {
          type: 'PAYMENT_SUCCESS',
          transaction: transaction,
          message: 'Payment completed successfully'
        });
      }
    }
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleChargeFailed(data: any, app: any) {
  try {
    const reference = data.reference;
    const transaction = await storage.getTransactionByReference(reference);
    
    if (transaction) {
      await storage.updateTransaction(transaction.id, {
        status: 'FAILED',
        failedAt: new Date(),
        gatewayResponse: data
      });

      // Emit real-time update
      if (app.get('io')) {
        const io = app.get('io');
        io.to(`user_${transaction.userId}`).emit('payment_update', {
          type: 'PAYMENT_FAILED',
          transaction: transaction,
          message: 'Payment failed. Please try again.'
        });
      }
    }
  } catch (error) {
    console.error('Error handling charge failed:', error);
  }
}

async function handleTransferSuccess(data: any, app: any) {
  // Handle successful transfer notifications
  console.log('Transfer successful:', data);
}

async function handleTransferFailed(data: any, app: any) {
  // Handle failed transfer notifications
  console.log('Transfer failed:', data);
}