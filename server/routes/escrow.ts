
import express from "express";
import { db } from "../db";
import { escrowTransactions, transactions, orders } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const createEscrowSchema = z.object({
  orderId: z.number(),
  sellerId: z.number(),
  amount: z.number().positive(),
  description: z.string().optional()
});

const releaseEscrowSchema = z.object({
  escrowId: z.number(),
  releaseType: z.enum(['FULL', 'PARTIAL']),
  amount: z.number().optional()
});

const disputeEscrowSchema = z.object({
  escrowId: z.number(),
  reason: z.string().min(10),
  evidence: z.string().optional()
});

// Create escrow transaction automatically for orders
router.post("/create", requireAuth, async (req, res) => {
  try {
    const buyerId = req.session!.userId!;
    const { orderId, sellerId, amount, description } = createEscrowSchema.parse(req.body);

    // Verify order exists and belongs to buyer
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.userId, buyerId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Calculate fees (2.5% platform fee)
    const platformFee = amount * 0.025;
    const sellerAmount = amount - platformFee;

    // Create escrow transaction
    const [escrowTransaction] = await db
      .insert(escrowTransactions)
      .values({
        orderId,
        buyerId,
        sellerId,
        totalAmount: amount.toString(),
        sellerAmount: sellerAmount.toString(),
        platformFee: platformFee.toString(),
        status: 'PENDING',
        description: description || `Escrow for order #${order.orderNumber}`,
        currency: 'NGN'
      })
      .returning();

    // Send real-time notifications
    if (global.io) {
      global.io.to(`user_${sellerId}`).emit('escrow_created', {
        escrowId: escrowTransaction.id,
        orderId,
        amount: sellerAmount,
        buyerId,
        timestamp: Date.now()
      });

      global.io.to(`user_${buyerId}`).emit('escrow_created', {
        escrowId: escrowTransaction.id,
        orderId,
        amount,
        sellerId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Escrow transaction created successfully",
      data: escrowTransaction
    });

  } catch (error: any) {
    console.error("Create escrow error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create escrow transaction"
    });
  }
});

// Release escrow funds
router.post("/release", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { escrowId, releaseType, amount } = releaseEscrowSchema.parse(req.body);

    // Get escrow transaction
    const [escrowTransaction] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        message: "Escrow transaction not found"
      });
    }

    // Verify user is the buyer
    if (escrowTransaction.buyerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can release escrow funds"
      });
    }

    // Check if escrow can be released
    if (!['HELD', 'ACTIVE'].includes(escrowTransaction.status)) {
      return res.status(400).json({
        success: false,
        message: "Escrow cannot be released in current state"
      });
    }

    let releaseAmount = parseFloat(escrowTransaction.sellerAmount);
    let newStatus = 'RELEASED_TO_SELLER';

    if (releaseType === 'PARTIAL' && amount) {
      releaseAmount = Math.min(amount, parseFloat(escrowTransaction.sellerAmount));
      newStatus = 'PARTIALLY_RELEASED';
    }

    // Update escrow status
    const [updatedEscrow] = await db
      .update(escrowTransactions)
      .set({
        status: newStatus,
        releasedAmount: releaseAmount.toString(),
        releasedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(escrowTransactions.id, escrowId))
      .returning();

    // Create transaction record for the release
    await db
      .insert(transactions)
      .values({
        userId: escrowTransaction.sellerId,
        type: 'ESCROW_RELEASE',
        status: 'SUCCESS',
        amount: releaseAmount.toString(),
        netAmount: releaseAmount.toString(),
        currency: 'NGN',
        description: `Escrow release for order #${escrowTransaction.orderId}`,
        completedAt: new Date(),
        metadata: {
          escrowId,
          releaseType,
          buyerId: userId
        }
      });

    // Send real-time notifications
    if (global.io) {
      global.io.to(`user_${escrowTransaction.sellerId}`).emit('escrow_released', {
        escrowId,
        amount: releaseAmount,
        releaseType,
        timestamp: Date.now()
      });

      global.io.to(`user_${userId}`).emit('escrow_release_confirmed', {
        escrowId,
        amount: releaseAmount,
        releaseType,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Escrow funds released successfully",
      data: updatedEscrow
    });

  } catch (error: any) {
    console.error("Release escrow error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to release escrow funds"
    });
  }
});

// Dispute escrow transaction
router.post("/escrow/dispute", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { escrowId, reason, evidence } = disputeEscrowSchema.parse(req.body);

    // Get escrow transaction
    const [escrowTransaction] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        message: "Escrow transaction not found"
      });
    }

    // Verify user is involved in the transaction
    if (![escrowTransaction.buyerId, escrowTransaction.sellerId].includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if escrow can be disputed
    if (!['HELD', 'ACTIVE'].includes(escrowTransaction.status)) {
      return res.status(400).json({
        success: false,
        message: "Escrow cannot be disputed in current state"
      });
    }

    // Update escrow status
    const [updatedEscrow] = await db
      .update(escrowTransactions)
      .set({
        status: 'DISPUTED',
        disputeReason: reason,
        disputeEvidence: evidence,
        disputedBy: userId,
        disputedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(escrowTransactions.id, escrowId))
      .returning();

    // Send real-time notifications
    if (global.io) {
      const otherParty = userId === escrowTransaction.buyerId ? 
        escrowTransaction.sellerId : escrowTransaction.buyerId;

      global.io.to(`user_${otherParty}`).emit('escrow_disputed', {
        escrowId,
        disputedBy: userId,
        reason,
        timestamp: Date.now()
      });

      // Notify admin
      global.io.to('admin_dashboard').emit('new_escrow_dispute', {
        escrowId,
        disputedBy: userId,
        reason,
        amount: escrowTransaction.totalAmount,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Escrow dispute created successfully",
      data: updatedEscrow
    });

  } catch (error: any) {
    console.error("Dispute escrow error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create escrow dispute"
    });
  }
});

// Get user's escrow transactions
router.get("/escrow/my-transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = eq(escrowTransactions.buyerId, userId);
    
    if (status) {
      whereClause = and(whereClause, eq(escrowTransactions.status, status as string));
    }

    const userEscrowTransactions = await db
      .select()
      .from(escrowTransactions)
      .where(whereClause)
      .orderBy(desc(escrowTransactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      data: userEscrowTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        hasMore: userEscrowTransactions.length === Number(limit)
      }
    });

  } catch (error: any) {
    console.error("Get escrow transactions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch escrow transactions"
    });
  }
});

// Get specific escrow transaction
router.get("/escrow/:escrowId", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { escrowId } = req.params;

    const [escrowTransaction] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, parseInt(escrowId)))
      .limit(1);

    if (!escrowTransaction) {
      return res.status(404).json({
        success: false,
        message: "Escrow transaction not found"
      });
    }

    // Verify user is involved in the transaction
    if (![escrowTransaction.buyerId, escrowTransaction.sellerId].includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: escrowTransaction
    });

  } catch (error: any) {
    console.error("Get escrow transaction error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch escrow transaction"
    });
  }
});

export default router;
