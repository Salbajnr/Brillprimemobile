
import { Express } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middleware/adminAuth';
import { storage } from '../storage';
import { sanitizeInput, validateSchema } from '../middleware/validation';

const reviewKycSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  notes: z.string().max(500).optional()
});

export function registerAdminMerchantKycRoutes(app: Express) {
  // Get pending merchant KYC submissions
  app.get("/api/admin/merchant-kyc/pending", adminAuth, async (req, res) => {
    try {
      const { page = '1', limit = '20', status = 'PENDING' } = req.query;
      
      const submissions = await storage.getMerchantKycSubmissions({
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      // Get stats
      const stats = await storage.getMerchantKycStats();

      res.json({
        success: true,
        data: {
          submissions: submissions.submissions,
          pagination: submissions.pagination,
          stats
        }
      });

    } catch (error) {
      console.error('Get pending merchant KYC error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending KYC submissions'
      });
    }
  });

  // Review merchant KYC submission
  app.post("/api/admin/merchant-kyc/:submissionId/review", adminAuth, [
    sanitizeInput(),
    validateSchema(reviewKycSchema),
    async (req, res) => {
      try {
        const { submissionId } = req.params;
        const { action, reason, notes } = req.body;
        const adminId = req.adminUser.adminId;

        const isApproved = action === 'approve';
        
        // Update KYC submission status
        const updatedSubmission = await storage.updateMerchantKycSubmission(
          parseInt(submissionId),
          {
            status: isApproved ? 'APPROVED' : 'REJECTED',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            rejectionReason: reason,
            reviewNotes: notes
          }
        );

        if (isApproved) {
          // Update merchant profile to verified status
          await storage.updateMerchantProfile(updatedSubmission.merchantId, {
            isKycVerified: true,
            kycCompletedAt: new Date(),
            verificationLevel: 'FULL'
          });

          // Grant additional privileges
          await storage.updateUser(updatedSubmission.merchantId, {
            isIdentityVerified: true,
            verificationTier: 'PREMIUM'
          });
        }

        // Notify merchant via WebSocket
        if (global.io) {
          global.io.to(`user_${updatedSubmission.merchantId}`).emit('kyc_status_update', {
            type: 'MERCHANT_KYC_REVIEWED',
            status: isApproved ? 'APPROVED' : 'REJECTED',
            reason,
            notes,
            timestamp: Date.now()
          });
        }

        res.json({
          success: true,
          message: `Merchant KYC ${action}d successfully`
        });

      } catch (error: any) {
        console.error('Review merchant KYC error:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            success: false,
            message: 'Invalid review data',
            errors: error.errors
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to review KYC submission'
        });
      }
    }
  ]);

  // Batch review multiple KYC submissions
  app.post("/api/admin/merchant-kyc/batch-review", adminAuth, [
    sanitizeInput(),
    async (req, res) => {
      try {
        const { submissionIds, action, reason } = req.body;
        const adminId = req.adminUser.adminId;

        const isApproved = action === 'approve';
        const results = [];

        for (const submissionId of submissionIds) {
          try {
            const updatedSubmission = await storage.updateMerchantKycSubmission(
              parseInt(submissionId),
              {
                status: isApproved ? 'APPROVED' : 'REJECTED',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason
              }
            );

            if (isApproved) {
              await storage.updateMerchantProfile(updatedSubmission.merchantId, {
                isKycVerified: true,
                kycCompletedAt: new Date()
              });
            }

            // Notify merchant
            if (global.io) {
              global.io.to(`user_${updatedSubmission.merchantId}`).emit('kyc_status_update', {
                type: 'MERCHANT_KYC_REVIEWED',
                status: isApproved ? 'APPROVED' : 'REJECTED',
                reason,
                timestamp: Date.now()
              });
            }

            results.push({ submissionId, status: 'success' });
          } catch (error) {
            results.push({ submissionId, status: 'error', error: error.message });
          }
        }

        res.json({
          success: true,
          message: `Batch review completed`,
          results
        });

      } catch (error) {
        console.error('Batch review merchant KYC error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to batch review KYC submissions'
        });
      }
    }
  ]);

  // Get merchant KYC analytics
  app.get("/api/admin/merchant-kyc/analytics", adminAuth, async (req, res) => {
    try {
      const analytics = await storage.getMerchantKycAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Get merchant KYC analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get KYC analytics'
      });
    }
  });

  // Get merchant KYC document
  app.get("/api/admin/merchant-kyc/:submissionId/document/:documentType", adminAuth, async (req, res) => {
    try {
      const { submissionId, documentType } = req.params;
      
      const submission = await storage.getMerchantKycSubmissionById(parseInt(submissionId));
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'KYC submission not found'
        });
      }

      // Get document URL based on type
      const documentUrls = {
        businessRegistration: submission.businessRegistrationUrl,
        taxCertificate: submission.taxCertificateUrl,
        businessLicense: submission.businessLicenseUrl,
        ownerIdDocument: submission.ownerIdDocumentUrl,
        bankStatement: submission.bankStatementUrl,
        proofOfAddress: submission.proofOfAddressUrl
      };

      const documentUrl = documentUrls[documentType as keyof typeof documentUrls];
      if (!documentUrl) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      res.json({
        success: true,
        data: { documentUrl }
      });

    } catch (error) {
      console.error('Get KYC document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get document'
      });
    }
  });
}
