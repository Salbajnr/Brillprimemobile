import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { z } from "zod";
import { transactionService } from "../services/transaction";

// Validation schemas
const escrowFilterSchema = z.object({
  status: z.enum(['all', 'active', 'disputed', 'pending', 'released']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

const resolveDisputeSchema = z.object({
  escrowId: z.number(),
  action: z.enum(['refund', 'release', 'partial']),
  notes: z.string().min(10),
  partialAmount: z.number().optional()
});

const releaseEscrowSchema = z.object({
  escrowId: z.number(),
  reason: z.string().optional()
});

export function registerEscrowManagementRoutes(app: Express) {
  // Get escrow transactions with filtering
  app.get("/api/admin/escrow", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, limit, offset } = escrowFilterSchema.parse(req.query);

      const escrowTransactions = await storage.getEscrowTransactions({
        status,
        limit,
        offset
      });

      const totalCount = await storage.getEscrowTransactionsCount(status);
      const escrowBalance = await storage.getTotalEscrowBalance();
      const disputedCount = await storage.getDisputedEscrowCount();

      res.json({
        success: true,
        data: {
          transactions: escrowTransactions,
          totalCount,
          escrowBalance,
          disputedCount,
          pagination: {
            limit,
            offset,
            hasMore: offset + limit < totalCount
          }
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

  // Get escrow transaction details
  app.get("/api/admin/escrow/:escrowId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { escrowId } = req.params;

      const escrowTransaction = await storage.getEscrowTransactionDetails(parseInt(escrowId));

      if (!escrowTransaction) {
        return res.status(404).json({
          success: false,
          message: "Escrow transaction not found"
        });
      }

      // Get dispute timeline if disputed
      let disputeTimeline = null;
      if (escrowTransaction.status === 'DISPUTED') {
        disputeTimeline = await storage.getDisputeTimeline(parseInt(escrowId));
      }

      res.json({
        success: true,
        data: {
          ...escrowTransaction,
          disputeTimeline
        }
      });

    } catch (error: any) {
      console.error("Get escrow details error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch escrow details"
      });
    }
  });

  // Resolve dispute
  app.post("/api/admin/escrow/resolve-dispute", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { escrowId, action, notes, partialAmount } = resolveDisputeSchema.parse(req.body);
      const adminId = req.session!.userId!;

      const escrowTransaction = await storage.getEscrowTransactionDetails(escrowId);
      if (!escrowTransaction) {
        return res.status(404).json({
          success: false,
          message: "Escrow transaction not found"
        });
      }

      if (escrowTransaction.status !== 'DISPUTED') {
        return res.status(400).json({
          success: false,
          message: "Escrow transaction is not in disputed state"
        });
      }

      let resolutionResult;

      switch (action) {
        case 'refund':
          resolutionResult = await storage.processEscrowRefund(
            escrowId,
            parseFloat(escrowTransaction.totalAmount),
            notes,
            adminId
          );
          break;

        case 'release':
          resolutionResult = await storage.releaseEscrowToSeller(
            escrowId,
            notes,
            adminId
          );
          break;

        case 'partial':
          if (!partialAmount) {
            return res.status(400).json({
              success: false,
              message: "Partial amount is required for partial refund"
            });
          }
          resolutionResult = await storage.processPartialEscrowRefund(
            escrowId,
            partialAmount,
            notes,
            adminId
          );
          break;
      }

      // Real-time notifications
      if (global.io) {
        const io = global.io;

        // Notify buyer
        io.to(`user_${escrowTransaction.buyerId}`).emit('escrow_dispute_resolved', {
          escrowId,
          action,
          amount: action === 'partial' ? partialAmount : escrowTransaction.totalAmount,
          notes,
          timestamp: Date.now()
        });

        // Notify seller
        io.to(`user_${escrowTransaction.sellerId}`).emit('escrow_dispute_resolved', {
          escrowId,
          action,
          amount: action === 'release' ? escrowTransaction.sellerAmount : 
                  action === 'partial' ? parseFloat(escrowTransaction.totalAmount) - partialAmount : 0,
          notes,
          timestamp: Date.now()
        });

        // Notify admin dashboard
        io.to('admin_dashboard').emit('escrow_dispute_resolved', {
          escrowId,
          action,
          resolvedBy: adminId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Dispute resolved successfully",
        data: resolutionResult
      });

    } catch (error: any) {
      console.error("Resolve dispute error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to resolve dispute"
      });
    }
  });

  // Release escrow early
  app.post("/api/admin/escrow/release", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { escrowId, reason } = releaseEscrowSchema.parse(req.body);
      const adminId = req.session!.userId!;

      const escrowTransaction = await storage.getEscrowTransactionDetails(escrowId);
      if (!escrowTransaction) {
        return res.status(404).json({
          success: false,
          message: "Escrow transaction not found"
        });
      }

      if (!['HELD', 'ACTIVE'].includes(escrowTransaction.status)) {
        return res.status(400).json({
          success: false,
          message: "Escrow cannot be released in current state"
        });
      }

      const releaseResult = await storage.releaseEscrowToSeller(
        escrowId,
        reason || 'Admin early release',
        adminId
      );

      // Real-time notifications
      if (global.io) {
        const io = global.io;

        // Notify seller
        io.to(`user_${escrowTransaction.sellerId}`).emit('escrow_released', {
          escrowId,
          amount: escrowTransaction.sellerAmount,
          reason: reason || 'Admin early release',
          timestamp: Date.now()
        });

        // Notify buyer
        io.to(`user_${escrowTransaction.buyerId}`).emit('escrow_released', {
          escrowId,
          orderId: escrowTransaction.orderId,
          timestamp: Date.now()
        });

        // Update admin dashboard
        io.to('admin_dashboard').emit('escrow_status_update', {
          escrowId,
          status: 'RELEASED_TO_SELLER',
          releasedBy: adminId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Escrow released successfully",
        data: releaseResult
      });

    } catch (error: any) {
      console.error("Release escrow error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to release escrow"
      });
    }
  });

  // Get escrow analytics
  app.get("/api/admin/escrow/analytics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getEscrowAnalytics();

      res.json({
        success: true,
        data: analytics
      });

    } catch (error: any) {
      console.error("Get escrow analytics error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch escrow analytics"
      });
    }
  });

  // Get dispute evidence
  app.get("/api/admin/escrow/:escrowId/evidence", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { escrowId } = req.params;

      const evidence = await storage.getDisputeEvidence(parseInt(escrowId));

      res.json({
        success: true,
        data: evidence
      });

    } catch (error: any) {
      console.error("Get dispute evidence error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch dispute evidence"
      });
    }
  });

  // Escalate dispute
  app.post("/api/admin/escrow/:escrowId/escalate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { escrowId } = req.params;
      const { priority, notes } = req.body;
      const adminId = req.session!.userId!;

      const escalationResult = await storage.escalateDispute(
        parseInt(escrowId),
        priority,
        notes,
        adminId
      );

      // Real-time notification
      if (global.io) {
        global.io.to('admin_dashboard').emit('dispute_escalated', {
          escrowId: parseInt(escrowId),
          priority,
          escalatedBy: adminId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Dispute escalated successfully",
        data: escalationResult
      });

    } catch (error: any) {
      console.error("Escalate dispute error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to escalate dispute"
      });
    }
  });
}