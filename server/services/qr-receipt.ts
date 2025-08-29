import { db } from '../db';
import { transactions, users, orders } from '../../shared/schema';
// Note: qrPaymentReceipts, qrReceiptScans are not yet implemented in schema
import { eq, and, desc } from 'drizzle-orm';
import QRCode from 'qrcode';

export class QRReceiptService {
  // Generate QR code for payment receipt
  async generateReceiptQR(transactionId: string, consumerId: number, merchantId: number, serviceType: string) {
    try {
      // Get transaction details
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Generate unique receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Generate unique QR code
      const qrCodeData = `RECEIPT_${transactionId}_${receiptNumber}_${consumerId}_${merchantId}`;
      
      // Set expiry to 1 year from now (receipts should be long-lasting)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create QR receipt record
      const [qrReceipt] = await db
        .insert(qrPaymentReceipts)
        .values({
          transactionId: parseInt(transactionId),
          consumerId,
          merchantId,
          qrCode: qrCodeData,
          receiptNumber,
          amount: transaction.amount,
          currency: transaction.currency || 'NGN',
          paymentMethod: transaction.paymentMethod,
          serviceType,
          status: 'ACTIVE',
          expiresAt,
          metadata: {
            transactionRef: transaction.transactionRef,
            gatewayRef: transaction.paymentGatewayRef,
            generatedAt: new Date().toISOString()
          }
        })
        .returning();

      // Generate actual QR code image as base64
      const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return {
        success: true,
        receipt: qrReceipt,
        qrCodeImage,
        qrCodeData,
        receiptNumber
      };

    } catch (error: any) {
      console.error('QR receipt generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate QR receipt'
      };
    }
  }

  // Scan and verify QR receipt
  async scanReceiptQR(qrCode: string, scannedBy: number, location?: string, latitude?: number, longitude?: number) {
    try {
      // Validate QR code format
      if (!qrCode.startsWith('RECEIPT_')) {
        return {
          success: false,
          error: 'Invalid QR receipt code format'
        };
      }

      // Extract receipt details from QR code
      const qrParts = qrCode.split('_');
      if (qrParts.length !== 5) {
        return {
          success: false,
          error: 'Invalid QR receipt code structure'
        };
      }

      const [, transactionId, receiptNumber, consumerId, merchantId] = qrParts;

      // Find the receipt record
      const [receipt] = await db
        .select({
          id: qrPaymentReceipts.id,
          transactionId: qrPaymentReceipts.transactionId,
          consumerId: qrPaymentReceipts.consumerId,
          merchantId: qrPaymentReceipts.merchantId,
          qrCode: qrPaymentReceipts.qrCode,
          receiptNumber: qrPaymentReceipts.receiptNumber,
          amount: qrPaymentReceipts.amount,
          currency: qrPaymentReceipts.currency,
          paymentMethod: qrPaymentReceipts.paymentMethod,
          serviceType: qrPaymentReceipts.serviceType,
          status: qrPaymentReceipts.status,
          scannedAt: qrPaymentReceipts.scannedAt,
          scannedBy: qrPaymentReceipts.scannedBy,
          expiresAt: qrPaymentReceipts.expiresAt,
          metadata: qrPaymentReceipts.metadata,
          createdAt: qrPaymentReceipts.createdAt,
          // Join user details
          consumerName: users.fullName,
          consumerEmail: users.email
        })
        .from(qrPaymentReceipts)
        .leftJoin(users, eq(qrPaymentReceipts.consumerId, users.id))
        .where(eq(qrPaymentReceipts.qrCode, qrCode))
        .limit(1);

      if (!receipt) {
        return {
          success: false,
          error: 'QR receipt not found'
        };
      }

      // Check if receipt has expired
      if (receipt.expiresAt && new Date() > receipt.expiresAt) {
        return {
          success: false,
          error: 'QR receipt has expired'
        };
      }

      // Check if receipt is still active
      if (receipt.status !== 'ACTIVE') {
        return {
          success: false,
          error: `QR receipt is ${receipt.status.toLowerCase()}`
        };
      }

      // Get scanner details
      const [scanner] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, scannedBy))
        .limit(1);

      if (!scanner) {
        return {
          success: false,
          error: 'Scanner user not found'
        };
      }

      // Record the scan
      const [scanRecord] = await db
        .insert(qrReceiptScans)
        .values({
          receiptId: receipt.id,
          scannedBy,
          scanType: 'VERIFICATION',
          location,
          latitude: latitude?.toString(),
          longitude: longitude?.toString(),
          scanResult: 'SUCCESS',
          metadata: {
            scannerRole: scanner.role,
            scannerName: scanner.fullName,
            scannedAt: new Date().toISOString()
          }
        })
        .returning();

      // Update receipt status to indicate it has been scanned
      await db
        .update(qrPaymentReceipts)
        .set({
          status: 'SCANNED',
          scannedAt: new Date(),
          scannedBy,
          updatedAt: new Date()
        })
        .where(eq(qrPaymentReceipts.id, receipt.id));

      return {
        success: true,
        receipt: {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          amount: receipt.amount,
          currency: receipt.currency,
          paymentMethod: receipt.paymentMethod,
          serviceType: receipt.serviceType,
          consumer: {
            name: receipt.consumerName,
            email: receipt.consumerEmail
          },
          transaction: {
            id: receipt.transactionId,
            metadata: receipt.metadata
          },
          createdAt: receipt.createdAt
        },
        scanner: {
          name: scanner.fullName,
          role: scanner.role
        },
        scanRecord
      };

    } catch (error: any) {
      console.error('QR receipt scan error:', error);
      return {
        success: false,
        error: error.message || 'Failed to scan QR receipt'
      };
    }
  }

  // Get receipt details by ID
  async getReceiptById(receiptId: number, userId: number) {
    try {
      const [receipt] = await db
        .select({
          id: qrPaymentReceipts.id,
          transactionId: qrPaymentReceipts.transactionId,
          consumerId: qrPaymentReceipts.consumerId,
          merchantId: qrPaymentReceipts.merchantId,
          qrCode: qrPaymentReceipts.qrCode,
          receiptNumber: qrPaymentReceipts.receiptNumber,
          amount: qrPaymentReceipts.amount,
          currency: qrPaymentReceipts.currency,
          paymentMethod: qrPaymentReceipts.paymentMethod,
          serviceType: qrPaymentReceipts.serviceType,
          status: qrPaymentReceipts.status,
          scannedAt: qrPaymentReceipts.scannedAt,
          expiresAt: qrPaymentReceipts.expiresAt,
          metadata: qrPaymentReceipts.metadata,
          createdAt: qrPaymentReceipts.createdAt,
          // Join user details
          consumerName: users.fullName,
          consumerEmail: users.email
        })
        .from(qrPaymentReceipts)
        .leftJoin(users, eq(qrPaymentReceipts.consumerId, users.id))
        .where(
          and(
            eq(qrPaymentReceipts.id, receiptId),
            // User must be either the consumer or merchant
            // You could expand this to include admins
            eq(qrPaymentReceipts.consumerId, userId)
          )
        )
        .limit(1);

      if (!receipt) {
        return {
          success: false,
          error: 'Receipt not found or access denied'
        };
      }

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(receipt.qrCode, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return {
        success: true,
        receipt: {
          ...receipt,
          qrCodeImage
        }
      };

    } catch (error: any) {
      console.error('Get receipt error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get receipt'
      };
    }
  }

  // Get all receipts for a user
  async getUserReceipts(userId: number, role: string, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      let whereCondition;
      if (role === 'CONSUMER') {
        whereCondition = eq(qrPaymentReceipts.consumerId, userId);
      } else if (role === 'MERCHANT') {
        whereCondition = eq(qrPaymentReceipts.merchantId, userId);
      } else {
        // Admin can see all receipts
        whereCondition = undefined;
      }

      const receipts = await db
        .select({
          id: qrPaymentReceipts.id,
          receiptNumber: qrPaymentReceipts.receiptNumber,
          amount: qrPaymentReceipts.amount,
          currency: qrPaymentReceipts.currency,
          paymentMethod: qrPaymentReceipts.paymentMethod,
          serviceType: qrPaymentReceipts.serviceType,
          status: qrPaymentReceipts.status,
          scannedAt: qrPaymentReceipts.scannedAt,
          createdAt: qrPaymentReceipts.createdAt,
          consumerName: users.fullName,
          consumerEmail: users.email
        })
        .from(qrPaymentReceipts)
        .leftJoin(users, eq(qrPaymentReceipts.consumerId, users.id))
        .where(whereCondition)
        .orderBy(desc(qrPaymentReceipts.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        receipts,
        pagination: {
          page,
          limit,
          hasMore: receipts.length === limit
        }
      };

    } catch (error: any) {
      console.error('Get user receipts error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get receipts'
      };
    }
  }

  // Get scan history for a receipt
  async getReceiptScans(receiptId: number) {
    try {
      const scans = await db
        .select({
          id: qrReceiptScans.id,
          scannedBy: qrReceiptScans.scannedBy,
          scanType: qrReceiptScans.scanType,
          location: qrReceiptScans.location,
          latitude: qrReceiptScans.latitude,
          longitude: qrReceiptScans.longitude,
          scanResult: qrReceiptScans.scanResult,
          notes: qrReceiptScans.notes,
          metadata: qrReceiptScans.metadata,
          createdAt: qrReceiptScans.createdAt,
          scannerName: users.fullName,
          scannerRole: users.role
        })
        .from(qrReceiptScans)
        .leftJoin(users, eq(qrReceiptScans.scannedBy, users.id))
        .where(eq(qrReceiptScans.receiptId, receiptId))
        .orderBy(desc(qrReceiptScans.createdAt));

      return {
        success: true,
        scans
      };

    } catch (error: any) {
      console.error('Get receipt scans error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get scan history'
      };
    }
  }
}

export const qrReceiptService = new QRReceiptService();