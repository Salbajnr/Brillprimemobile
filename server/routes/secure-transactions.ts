import { Express } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';

// Validation schemas for secure transaction system
const initiatePaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().min(0),
  paymentMethod: z.enum(['card', 'bank_transfer', 'wallet']),
  customerDetails: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string()
  })
});

const releaseEscrowSchema = z.object({
  transactionId: z.string(),
  releaseType: z.enum(['automatic', 'customer_confirmation', 'manual_admin', 'dispute_resolution']),
  notes: z.string().optional()
});

const disputeSchema = z.object({
  transactionId: z.string(),
  disputeType: z.enum(['non_delivery', 'wrong_item', 'damaged_goods', 'service_issue']),
  description: z.string().min(10),
  evidence: z.array(z.object({
    type: z.enum(['image', 'document', 'video']),
    url: z.string()
  })).optional()
});

export function registerSecureTransactionRoutes(app: Express) {
  // PAYMENT INITIATION
  app.post("/api/transactions/initiate-payment", requireAuth, async (req, res) => {
    try {
      const validatedData = initiatePaymentSchema.parse(req.body);
      const customerId = req.session!.userId!;

      // Create escrow transaction
      const transaction = await storage.createEscrowTransaction({
        orderId: validatedData.orderId,
        customerId,
        amount: validatedData.amount,
        status: 'PENDING',
        paymentMethod: validatedData.paymentMethod,
        customerDetails: validatedData.customerDetails,
        createdAt: new Date(),
        escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Process payment with Paystack/Flutterwave
      const paymentResponse = await storage.processSecurePayment({
        transactionId: transaction.id,
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        customerDetails: validatedData.customerDetails
      });

      if (paymentResponse.success) {
        // Update transaction status
        await storage.updateEscrowTransaction(transaction.id, {
          status: 'PAID',
          paymentReference: paymentResponse.reference,
          paidAt: new Date()
        });

        // Notify merchant via WebSocket
        const order = await storage.getOrderById(validatedData.orderId);
        if (order && global.io) {
          global.io.to(`user_${order.sellerId}`).emit('payment_received', {
            orderId: validatedData.orderId,
            transactionId: transaction.id,
            amount: validatedData.amount,
            customerName: validatedData.customerDetails.name,
            timestamp: Date.now()
          });
        }

        res.json({
          success: true,
          transaction: {
            id: transaction.id,
            status: 'PAID',
            escrowReleaseDate: transaction.escrowReleaseDate
          },
          message: "Payment successful. Funds secured in escrow."
        });
      } else {
        await storage.updateEscrowTransaction(transaction.id, {
          status: 'FAILED',
          failureReason: paymentResponse.error
        });

        res.status(400).json({
          success: false,
          message: "Payment failed: " + paymentResponse.error
        });
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Payment processing failed" });
    }
  });

  // ESCROW MANAGEMENT - Automatic Release
  app.post("/api/transactions/release-escrow", requireAuth, async (req, res) => {
    try {
      const validatedData = releaseEscrowSchema.parse(req.body);
      
      const transaction = await storage.getEscrowTransaction(validatedData.transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verify release conditions
      const canRelease = await storage.verifyEscrowReleaseConditions(transaction.id);
      if (!canRelease.eligible) {
        return res.status(400).json({ 
          message: "Escrow cannot be released", 
          reason: canRelease.reason 
        });
      }

      // Process escrow release
      const releaseResult = await storage.releaseEscrowFunds({
        transactionId: validatedData.transactionId,
        releaseType: validatedData.releaseType,
        notes: validatedData.notes,
        releasedBy: req.session!.userId!
      });

      // Notify all parties
      if (global.io) {
        // Notify merchant
        global.io.to(`user_${transaction.merchantId}`).emit('funds_released', {
          transactionId: validatedData.transactionId,
          amount: transaction.amount,
          releaseType: validatedData.releaseType,
          timestamp: Date.now()
        });

        // Notify customer
        global.io.to(`user_${transaction.customerId}`).emit('transaction_completed', {
          transactionId: validatedData.transactionId,
          status: 'COMPLETED',
          timestamp: Date.now()
        });

        // Notify admin
        global.io.to('admin').emit('escrow_released', {
          transactionId: validatedData.transactionId,
          amount: transaction.amount,
          releaseType: validatedData.releaseType,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Escrow funds released successfully",
        releaseDetails: releaseResult
      });
    } catch (error: any) {
      console.error("Escrow release error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid release data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to release escrow funds" });
    }
  });

  // DISPUTE MANAGEMENT
  app.post("/api/transactions/file-dispute", requireAuth, async (req, res) => {
    try {
      const validatedData = disputeSchema.parse(req.body);
      const userId = req.session!.userId!;

      const dispute = await storage.createDispute({
        transactionId: validatedData.transactionId,
        filedBy: userId,
        disputeType: validatedData.disputeType,
        description: validatedData.description,
        evidence: validatedData.evidence || [],
        status: 'OPEN',
        filedAt: new Date()
      });

      // Hold escrow funds during dispute
      await storage.updateEscrowTransaction(validatedData.transactionId, {
        status: 'DISPUTED',
        disputeId: dispute.id
      });

      // Notify all parties and admin
      if (global.io) {
        const transaction = await storage.getEscrowTransaction(validatedData.transactionId);
        
        // Notify other party
        const otherPartyId = transaction.customerId === userId ? 
          transaction.merchantId : transaction.customerId;
        
        global.io.to(`user_${otherPartyId}`).emit('dispute_filed', {
          transactionId: validatedData.transactionId,
          disputeId: dispute.id,
          disputeType: validatedData.disputeType,
          timestamp: Date.now()
        });

        // Notify admin for review
        global.io.to('admin').emit('new_dispute', {
          disputeId: dispute.id,
          transactionId: validatedData.transactionId,
          disputeType: validatedData.disputeType,
          amount: transaction.amount,
          urgency: 'HIGH',
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        dispute: {
          id: dispute.id,
          status: 'OPEN',
          evidenceDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000)
        },
        message: "Dispute filed successfully. Escrow funds are now held."
      });
    } catch (error: any) {
      console.error("Dispute filing error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid dispute data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to file dispute" });
    }
  });

  // GET ESCROW BALANCE (Merchant view)
  app.get("/api/transactions/escrow-balance", requireAuth, async (req, res) => {
    try {
      const merchantId = req.session!.userId!;
      
      const escrowBalance = await storage.getMerchantEscrowBalance(merchantId);
      
      res.json({
        success: true,
        escrowBalance: {
          totalHeld: escrowBalance.totalHeld,
          pendingRelease: escrowBalance.pendingRelease,
          availableForWithdrawal: escrowBalance.availableForWithdrawal,
          totalWithdrawn: escrowBalance.totalWithdrawn,
          transactions: escrowBalance.recentTransactions
        }
      });
    } catch (error) {
      console.error("Escrow balance error:", error);
      res.status(500).json({ message: "Failed to fetch escrow balance" });
    }
  });

  // GET TRANSACTION HISTORY
  app.get("/api/transactions/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { status, limit = 50, offset = 0 } = req.query;

      const transactions = await storage.getUserTransactionHistory(userId, {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        transactions: transactions.map(tx => ({
          id: tx.id,
          orderId: tx.orderId,
          amount: tx.amount,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          escrowReleaseDate: tx.escrowReleaseDate,
          disputeStatus: tx.disputeStatus
        }))
      });
    } catch (error) {
      console.error("Transaction history error:", error);
      res.status(500).json({ message: "Failed to fetch transaction history" });
    }
  });

  // CONFIRM DELIVERY (Customer)
  app.post("/api/transactions/confirm-delivery", requireAuth, async (req, res) => {
    try {
      const { transactionId, rating, feedback } = req.body;
      const customerId = req.session!.userId!;

      const transaction = await storage.getEscrowTransaction(transactionId);
      if (!transaction || transaction.customerId !== customerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Confirm delivery and trigger automatic escrow release
      await storage.confirmDelivery({
        transactionId,
        customerId,
        rating,
        feedback,
        confirmedAt: new Date()
      });

      // Automatically release escrow funds
      const releaseResult = await storage.releaseEscrowFunds({
        transactionId,
        releaseType: 'customer_confirmation',
        notes: 'Customer confirmed delivery satisfaction',
        releasedBy: customerId
      });

      // Real-time notifications
      if (global.io) {
        // Notify merchant
        global.io.to(`user_${transaction.merchantId}`).emit('delivery_confirmed', {
          transactionId,
          rating,
          feedback,
          fundsReleased: true,
          timestamp: Date.now()
        });

        // Notify admin
        global.io.to('admin').emit('transaction_completed', {
          transactionId,
          completionType: 'customer_confirmation',
          rating,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Delivery confirmed. Funds released to merchant.",
        releaseDetails: releaseResult
      });
    } catch (error) {
      console.error("Delivery confirmation error:", error);
      res.status(500).json({ message: "Failed to confirm delivery" });
    }
  });
}