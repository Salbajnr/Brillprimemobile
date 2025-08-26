import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { qrReceiptService } from '../services/qr-receipt';

const router = Router();

// Validation schemas
const generateReceiptQRSchema = z.object({
  transactionId: z.string(),
  merchantId: z.number(),
  serviceType: z.enum(['DELIVERY', 'FUEL', 'TOLL', 'TRANSFER', 'PAYMENT']).default('PAYMENT')
});

const scanReceiptQRSchema = z.object({
  qrCode: z.string(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

// Generate QR code receipt for a payment
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { transactionId, merchantId, serviceType } = generateReceiptQRSchema.parse(req.body);
    const consumerId = req.user.id;

    const result = await qrReceiptService.generateReceiptQR(
      transactionId,
      consumerId,
      merchantId,
      serviceType
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: 'QR receipt generated successfully',
      data: {
        receiptId: result.receipt.id,
        receiptNumber: result.receiptNumber,
        qrCodeImage: result.qrCodeImage,
        qrCodeData: result.qrCodeData,
        expiresAt: result.receipt.expiresAt
      }
    });

  } catch (error: any) {
    console.error('Generate QR receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate QR receipt'
    });
  }
});

// Scan QR receipt code (typically by merchants)
router.post('/scan', requireAuth, async (req, res) => {
  try {
    const { qrCode, location, latitude, longitude } = scanReceiptQRSchema.parse(req.body);
    const scannedBy = req.user.id;

    const result = await qrReceiptService.scanReceiptQR(
      qrCode,
      scannedBy,
      location,
      latitude,
      longitude
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Send real-time notification to consumer that their receipt was scanned
    if (global.io && result.receipt) {
      global.io.to(`user_${result.receipt.consumer?.id || result.receipt.transaction.id}`).emit('receipt_scanned', {
        receiptNumber: result.receipt.receiptNumber,
        scannedBy: result.scanner.name,
        scannerRole: result.scanner.role,
        location,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'QR receipt scanned successfully',
      data: {
        receipt: result.receipt,
        scanner: result.scanner
      }
    });

  } catch (error: any) {
    console.error('Scan QR receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to scan QR receipt'
    });
  }
});

// Get receipt details by ID
router.get('/:receiptId', requireAuth, async (req, res) => {
  try {
    const receiptId = parseInt(req.params.receiptId);
    const userId = req.user.id;

    if (isNaN(receiptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt ID'
      });
    }

    const result = await qrReceiptService.getReceiptById(receiptId, userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.receipt
    });

  } catch (error: any) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get receipt'
    });
  }
});

// Get all receipts for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 20 } = req.query;

    const result = await qrReceiptService.getUserReceipts(
      userId,
      userRole,
      parseInt(page as string),
      parseInt(limit as string)
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: {
        receipts: result.receipts,
        pagination: result.pagination
      }
    });

  } catch (error: any) {
    console.error('Get user receipts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get receipts'
    });
  }
});

// Get scan history for a receipt
router.get('/:receiptId/scans', requireAuth, async (req, res) => {
  try {
    const receiptId = parseInt(req.params.receiptId);

    if (isNaN(receiptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt ID'
      });
    }

    const result = await qrReceiptService.getReceiptScans(receiptId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.scans
    });

  } catch (error: any) {
    console.error('Get receipt scans error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get scan history'
    });
  }
});

// Validate QR receipt without scanning (preview)
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { qrCode } = z.object({ qrCode: z.string() }).parse(req.body);

    // Validate QR code format
    if (!qrCode.startsWith('RECEIPT_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR receipt code format'
      });
    }

    // Extract receipt details from QR code
    const qrParts = qrCode.split('_');
    if (qrParts.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR receipt code structure'
      });
    }

    const [, transactionId, receiptNumber, consumerId, merchantId] = qrParts;

    res.json({
      success: true,
      message: 'QR code is valid',
      data: {
        isValid: true,
        transactionId,
        receiptNumber,
        consumerId: parseInt(consumerId),
        merchantId: parseInt(merchantId)
      }
    });

  } catch (error: any) {
    console.error('Validate QR receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate QR receipt'
    });
  }
});

export default router;