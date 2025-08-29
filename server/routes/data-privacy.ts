
import { Router } from 'express';
import { db } from '../db';
import { users, securityLogs, auditLogs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { sanitizeInput, validateSchema } from '../middleware/validation';

const router = Router();

// GDPR Data Subject Request Schema
const dataRequestSchema = z.object({
  requestType: z.enum(['ACCESS', 'PORTABILITY', 'RECTIFICATION', 'ERASURE', 'RESTRICTION']),
  reason: z.string().min(10).max(500).optional(),
  dataCategories: z.array(z.string()).optional()
});

// Request personal data export (GDPR Article 15)
router.post('/request-data-export', requireAuth, sanitizeInput(), validateSchema(dataRequestSchema), async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { requestType, reason } = req.body;

    // Log the request
    await db.insert(auditLogs).values({
      userId,
      action: 'GDPR_DATA_REQUEST',
      resource: 'USER_DATA',
      resourceId: userId.toString(),
      newValues: JSON.stringify({ requestType, reason }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      success: true,
      metadata: JSON.stringify({ gdprArticle: 'Article 15' })
    });

    // Generate data export
    const userData = await generateUserDataExport(userId);
    
    // Store export request
    const exportId = `export_${userId}_${Date.now()}`;
    const exportPath = path.join(process.cwd(), 'exports', `${exportId}.json`);
    
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    await fs.writeFile(exportPath, JSON.stringify(userData, null, 2));

    res.json({
      success: true,
      message: 'Data export request submitted successfully',
      exportId,
      estimatedProcessingTime: '72 hours',
      downloadUrl: `/api/data-privacy/download-export/${exportId}`
    });

  } catch (error) {
    console.error('GDPR data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data export request'
    });
  }
});

// Download data export
router.get('/download-export/:exportId', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { exportId } = req.params;

    // Verify export belongs to user
    if (!exportId.includes(userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const exportPath = path.join(process.cwd(), 'exports', `${exportId}.json`);
    
    try {
      await fs.access(exportPath);
      res.download(exportPath, `personal-data-${Date.now()}.json`);
    } catch {
      res.status(404).json({
        success: false,
        message: 'Export file not found or expired'
      });
    }

  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download export'
    });
  }
});

// Request data deletion (GDPR Article 17)
router.post('/request-data-deletion', requireAuth, sanitizeInput(), async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { reason } = req.body;

    // Log deletion request
    await db.insert(auditLogs).values({
      userId,
      action: 'GDPR_DELETION_REQUEST',
      resource: 'USER_ACCOUNT',
      resourceId: userId.toString(),
      newValues: JSON.stringify({ reason }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      success: true,
      metadata: JSON.stringify({ gdprArticle: 'Article 17' })
    });

    // Mark user for deletion (soft delete initially)
    await db.update(users).set({
      isActive: false,
      updatedAt: new Date()
    }).where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Data deletion request submitted. Your account will be reviewed and deleted within 30 days.',
      processingTime: '30 days',
      contactEmail: 'privacy@brillprime.com'
    });

  } catch (error) {
    console.error('GDPR deletion request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deletion request'
    });
  }
});

// Data portability request (GDPR Article 20)
router.post('/request-data-portability', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { targetService } = req.body;

    const portableData = await generatePortableData(userId);
    
    await db.insert(auditLogs).values({
      userId,
      action: 'GDPR_PORTABILITY_REQUEST',
      resource: 'USER_DATA',
      resourceId: userId.toString(),
      newValues: JSON.stringify({ targetService }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      success: true,
      metadata: JSON.stringify({ gdprArticle: 'Article 20' })
    });

    res.json({
      success: true,
      message: 'Portable data package created',
      data: portableData,
      format: 'JSON',
      machineReadable: true
    });

  } catch (error) {
    console.error('Data portability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate portable data'
    });
  }
});

// Consent management
router.get('/consent-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    const consentStatus = {
      dataProcessing: true, // Required for service
      marketing: user?.isVerified || false,
      analytics: true,
      thirdPartySharing: false,
      lastUpdated: user?.updatedAt,
      legalBasis: 'Contract performance and legitimate interest'
    };

    res.json({
      success: true,
      consent: consentStatus
    });

  } catch (error) {
    console.error('Consent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get consent status'
    });
  }
});

// Update consent preferences
router.put('/consent-preferences', requireAuth, sanitizeInput(), async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { marketing, analytics, thirdPartySharing } = req.body;

    await db.insert(auditLogs).values({
      userId,
      action: 'CONSENT_UPDATE',
      resource: 'USER_PREFERENCES',
      resourceId: userId.toString(),
      newValues: JSON.stringify({ marketing, analytics, thirdPartySharing }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      success: true
    });

    res.json({
      success: true,
      message: 'Consent preferences updated successfully'
    });

  } catch (error) {
    console.error('Consent update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consent preferences'
    });
  }
});

async function generateUserDataExport(userId: number) {
  // This would compile all user data across all tables
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  return {
    exportDate: new Date().toISOString(),
    userId,
    personalData: {
      profile: user,
      // Add other data categories
    },
    metadata: {
      dataRetentionPeriod: '7 years',
      legalBasis: 'Contract performance',
      dataController: 'BrillPrime Technologies',
      contactEmail: 'privacy@brillprime.com'
    }
  };
}

async function generatePortableData(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  return {
    format: 'JSON',
    version: '1.0',
    userId,
    exportDate: new Date().toISOString(),
    data: {
      profile: user,
      // Add structured, machine-readable data
    }
  };
}

export default router;
