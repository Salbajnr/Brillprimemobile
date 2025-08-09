import { Express } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';

// Admin authorization middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    await requireAuth(req, res, () => {});
    
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Validation schemas
const disputeResolutionSchema = z.object({
  disputeId: z.string(),
  resolution: z.enum(['approve_customer', 'approve_merchant', 'partial_refund', 'no_action']),
  refundAmount: z.number().min(0).optional(),
  adminNotes: z.string().min(10),
  evidenceReviewed: z.boolean()
});

const manualEscrowActionSchema = z.object({
  transactionId: z.string(),
  action: z.enum(['release', 'refund', 'hold_extended']),
  reason: z.string().min(10),
  notifyParties: z.boolean().default(true)
});

export function registerAdminOversightRoutes(app: Express) {
  // SYSTEM MONITORING Dashboard
  app.get("/api/admin/system-metrics", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getSystemMetrics();
      
      // Enhanced real-time metrics
      const realTimeMetrics = {
        platform: {
          totalUsers: metrics.totalUsers,
          activeUsers: metrics.activeUsers,
          onlineDrivers: metrics.onlineDrivers,
          activeMerchants: metrics.activeMerchants,
          systemUptime: process.uptime(),
          serverHealth: 'HEALTHY'
        },
        transactions: {
          totalTransactions: metrics.totalTransactions,
          todayTransactions: metrics.todayTransactions,
          pendingTransactions: metrics.pendingTransactions,
          disputedTransactions: metrics.disputedTransactions,
          totalVolume: metrics.totalVolume,
          escrowBalance: metrics.totalEscrowBalance
        },
        security: {
          fraudAlerts: metrics.fraudAlerts,
          suspiciousActivities: metrics.suspiciousActivities,
          blockedUsers: metrics.blockedUsers,
          securityIncidents: metrics.securityIncidents
        },
        performance: {
          averageResponseTime: metrics.avgResponseTime,
          errorRate: metrics.errorRate,
          throughput: metrics.throughput,
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage()
        }
      };

      res.json({
        success: true,
        metrics: realTimeMetrics,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error("System metrics error:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  // USER MANAGEMENT - Account verification workflow
  app.get("/api/admin/pending-verifications", requireAdmin, async (req, res) => {
    try {
      const { type, limit = 50 } = req.query;
      
      const pendingVerifications = await storage.getPendingVerifications({
        type: type as string, // 'merchant', 'driver', 'identity'
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        verifications: pendingVerifications.map(verification => ({
          id: verification.id,
          userId: verification.userId,
          userDetails: verification.userDetails,
          verificationType: verification.type,
          documents: verification.documents,
          businessInfo: verification.businessInfo,
          submittedAt: verification.submittedAt,
          priority: verification.priority,
          riskScore: verification.riskScore
        }))
      });
    } catch (error) {
      console.error("Pending verifications error:", error);
      res.status(500).json({ message: "Failed to fetch pending verifications" });
    }
  });

  // Approve/Reject verification
  app.post("/api/admin/verification/:verificationId/review", requireAdmin, async (req, res) => {
    try {
      const { verificationId } = req.params;
      const { action, notes, requireAdditionalDocs } = req.body;
      const adminId = req.session!.userId!;

      const result = await storage.reviewVerification({
        verificationId,
        action, // 'approve', 'reject', 'request_more_info'
        adminId,
        notes,
        requireAdditionalDocs,
        reviewedAt: new Date()
      });

      // Real-time notification to user
      if (global.io) {
        global.io.to(`user_${result.userId}`).emit('verification_update', {
          verificationId,
          status: action,
          notes,
          requireAdditionalDocs,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: `Verification ${action}ed successfully`,
        result
      });
    } catch (error) {
      console.error("Verification review error:", error);
      res.status(500).json({ message: "Failed to review verification" });
    }
  });

  // ESCROW & FINANCIAL OPERATIONS
  app.get("/api/admin/escrow-overview", requireAdmin, async (req, res) => {
    try {
      const escrowOverview = await storage.getEscrowOverview();
      
      res.json({
        success: true,
        escrow: {
          totalBalance: escrowOverview.totalBalance, // ₦12.4M as mentioned
          pendingReleases: escrowOverview.pendingReleases,
          disputedAmount: escrowOverview.disputedAmount,
          releasedToday: escrowOverview.releasedToday,
          transactions: {
            pending: escrowOverview.pendingTransactions,
            disputed: escrowOverview.disputedTransactions,
            readyForRelease: escrowOverview.readyForRelease
          },
          analytics: {
            averageHoldTime: escrowOverview.avgHoldTime,
            releaseRate: escrowOverview.releaseRate,
            disputeRate: escrowOverview.disputeRate
          }
        }
      });
    } catch (error) {
      console.error("Escrow overview error:", error);
      res.status(500).json({ message: "Failed to fetch escrow overview" });
    }
  });

  // DISPUTE RESOLUTION with Evidence Review
  app.get("/api/admin/disputes", requireAdmin, async (req, res) => {
    try {
      const { status, priority, limit = 50 } = req.query;
      
      const disputes = await storage.getDisputes({
        status: status as string,
        priority: priority as string,
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        disputes: disputes.map(dispute => ({
          id: dispute.id,
          transactionId: dispute.transactionId,
          disputeType: dispute.disputeType,
          filedBy: dispute.filedBy,
          description: dispute.description,
          evidence: dispute.evidence,
          status: dispute.status,
          priority: dispute.priority,
          filedAt: dispute.filedAt,
          responseDeadline: dispute.responseDeadline,
          transactionAmount: dispute.transactionAmount,
          customerDetails: dispute.customerDetails,
          merchantDetails: dispute.merchantDetails
        }))
      });
    } catch (error) {
      console.error("Disputes fetch error:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Resolve dispute with admin decision
  app.post("/api/admin/disputes/:disputeId/resolve", requireAdmin, async (req, res) => {
    try {
      const { disputeId } = req.params;
      const validatedData = disputeResolutionSchema.parse(req.body);
      const adminId = req.session!.userId!;

      const resolution = await storage.resolveDispute({
        disputeId,
        resolution: validatedData.resolution,
        refundAmount: validatedData.refundAmount,
        adminId,
        adminNotes: validatedData.adminNotes,
        evidenceReviewed: validatedData.evidenceReviewed,
        resolvedAt: new Date()
      });

      // Process financial actions based on resolution
      if (validatedData.resolution === 'approve_customer') {
        await storage.refundEscrowToCustomer(resolution.transactionId, validatedData.refundAmount);
      } else if (validatedData.resolution === 'approve_merchant') {
        await storage.releaseEscrowToMerchant(resolution.transactionId);
      }

      // Real-time notifications
      if (global.io) {
        // Notify both parties
        global.io.to(`user_${resolution.customerId}`).emit('dispute_resolved', {
          disputeId,
          resolution: validatedData.resolution,
          refundAmount: validatedData.refundAmount,
          timestamp: Date.now()
        });

        global.io.to(`user_${resolution.merchantId}`).emit('dispute_resolved', {
          disputeId,
          resolution: validatedData.resolution,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Dispute resolved successfully",
        resolution
      });
    } catch (error: any) {
      console.error("Dispute resolution error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid resolution data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  // MANUAL FUND RELEASE/REFUND
  app.post("/api/admin/escrow/manual-action", requireAdmin, async (req, res) => {
    try {
      const validatedData = manualEscrowActionSchema.parse(req.body);
      const adminId = req.session!.userId!;

      const actionResult = await storage.performManualEscrowAction({
        transactionId: validatedData.transactionId,
        action: validatedData.action,
        adminId,
        reason: validatedData.reason,
        performedAt: new Date()
      });

      // Real-time notifications if requested
      if (validatedData.notifyParties && global.io) {
        const transaction = await storage.getEscrowTransaction(validatedData.transactionId);
        
        global.io.to(`user_${transaction.customerId}`).emit('escrow_manual_action', {
          transactionId: validatedData.transactionId,
          action: validatedData.action,
          reason: validatedData.reason,
          timestamp: Date.now()
        });

        global.io.to(`user_${transaction.merchantId}`).emit('escrow_manual_action', {
          transactionId: validatedData.transactionId,
          action: validatedData.action,
          reason: validatedData.reason,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: `Manual ${validatedData.action} completed successfully`,
        actionResult
      });
    } catch (error: any) {
      console.error("Manual escrow action error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid action data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to perform manual action" });
    }
  });

  // PLATFORM ANALYTICS
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const { timeframe = 'week', metrics } = req.query;
      
      const analytics = await storage.getPlatformAnalytics({
        timeframe: timeframe as string,
        metrics: metrics as string
      });

      res.json({
        success: true,
        analytics: {
          businessIntelligence: {
            totalRevenue: analytics.totalRevenue,
            transactionVolume: analytics.transactionVolume,
            userGrowth: analytics.userGrowth,
            marketShare: analytics.marketShare
          },
          userBehavior: {
            dailyActiveUsers: analytics.dailyActiveUsers,
            sessionDuration: analytics.avgSessionDuration,
            conversionRate: analytics.conversionRate,
            retentionRate: analytics.retentionRate
          },
          financial: {
            revenueGrowth: analytics.revenueGrowth,
            profitMargins: analytics.profitMargins,
            escrowTurnover: analytics.escrowTurnover,
            disputeResolutionCost: analytics.disputeResolutionCost
          },
          security: {
            fraudDetections: analytics.fraudDetections,
            securityIncidents: analytics.securityIncidents,
            riskScore: analytics.platformRiskScore
          }
        },
        timeframe,
        generatedAt: new Date()
      });
    } catch (error) {
      console.error("Platform analytics error:", error);
      res.status(500).json({ message: "Failed to fetch platform analytics" });
    }
  });

  // CONTENT & QUALITY CONTROL
  app.get("/api/admin/content-review", requireAdmin, async (req, res) => {
    try {
      const { type, status, limit = 50 } = req.query;
      
      const contentReviews = await storage.getContentForReview({
        type: type as string, // 'product', 'merchant_profile', 'user_content'
        status: status as string,
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        content: contentReviews.map(item => ({
          id: item.id,
          type: item.type,
          userId: item.userId,
          content: item.content,
          reportedBy: item.reportedBy,
          reportReason: item.reportReason,
          priority: item.priority,
          submittedAt: item.submittedAt,
          reviewStatus: item.reviewStatus
        }))
      });
    } catch (error) {
      console.error("Content review error:", error);
      res.status(500).json({ message: "Failed to fetch content for review" });
    }
  });

  // Real-time admin notifications setup
  app.post("/api/admin/subscribe-notifications", requireAdmin, async (req, res) => {
    try {
      const adminId = req.session!.userId!;
      
      if (global.io) {
        // Join admin notification rooms
        const adminSocket = global.io.sockets.sockets.get(req.body.socketId);
        if (adminSocket) {
          adminSocket.join('admin');
          adminSocket.join('admin_disputes');
          adminSocket.join('admin_security');
          adminSocket.join('admin_escrow');
        }
      }

      res.json({
        success: true,
        message: "Subscribed to admin real-time notifications"
      });
    } catch (error) {
      console.error("Admin notification subscription error:", error);
      res.status(500).json({ message: "Failed to subscribe to notifications" });
    }
  });
}