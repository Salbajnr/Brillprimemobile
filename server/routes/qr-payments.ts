import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { transactionService } from "../services/transaction";

// QR Payment schemas
const generateQRPaymentSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  merchantId: z.number().optional(),
  expiresIn: z.number().default(300) // 5 minutes default
});

const scanQRPaymentSchema = z.object({
  qrCode: z.string(),
  paymentMethodId: z.number().optional()
});

const generateDeliveryQRSchema = z.object({
  orderId: z.string()
});

const verifyDeliveryQRSchema = z.object({
  qrCode: z.string()
});

export function registerQRPaymentRoutes(app: Express) {
  // Generate QR code for payment
  app.post("/api/qr/generate-payment", requireAuth, async (req, res) => {
    try {
      const data = generateQRPaymentSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Generate unique QR code
      const qrCode = `PAY_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

      // Store QR payment data (you might want to create a dedicated table for this)
      const qrPaymentData = {
        qrCode,
        payeeId: userId,
        amount: data.amount,
        description: data.description,
        merchantId: data.merchantId,
        expiresAt,
        status: 'ACTIVE',
        createdAt: new Date()
      };

      // For now, we'll store this in memory/cache. In production, use a dedicated table
      // await storage.createQRPayment(qrPaymentData);

      res.json({
        success: true,
        qrCode,
        qrData: {
          amount: data.amount,
          description: data.description,
          payeeId: userId,
          expiresAt
        }
      });

    } catch (error: any) {
      console.error('QR payment generation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to generate QR payment code"
      });
    }
  });

  // Scan and process QR payment
  app.post("/api/qr/scan-payment", requireAuth, async (req, res) => {
    try {
      const data = scanQRPaymentSchema.parse(req.body);
      const payerId = req.session!.userId!;

      // Decode QR code to extract payment information
      if (!data.qrCode.startsWith('PAY_')) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR payment code"
        });
      }

      // Extract payment details from QR code
      // Validate QR code format: PAY_timestamp_payeeId_amount (optional)
      const qrParts = data.qrCode.split('_');
      if (qrParts.length < 3 || qrParts.length > 4) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code format. Expected PAY_timestamp_payeeId format."
        });
      }

      // Validate timestamp is numeric
      if (!/^\d+$/.test(qrParts[1])) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code format. Invalid timestamp."
        });
      }

      // Validate payeeId is numeric
      if (!/^\d+$/.test(qrParts[2])) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code format. Invalid payee ID."
        });
      }

      const timestamp = parseInt(qrParts[1]);
      const payeeId = parseInt(qrParts[2]);

      // Check if QR code is still valid (not expired)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (timestamp < fiveMinutesAgo) {
        return res.status(400).json({
          success: false,
          message: "QR code has expired"
        });
      }

      // Don't allow self-payment
      if (payerId === payeeId) {
        return res.status(400).json({
          success: false,
          message: "Cannot pay yourself"
        });
      }

      // Get payer information
      const payer = await storage.getUser(payerId);
      const payee = await storage.getUser(payeeId);

      if (!payer || !payee) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.json({
        success: true,
        paymentData: {
          qrCode: data.qrCode,
          payee: {
            id: payee.id,
            name: payee.fullName,
            email: payee.email
          },
          // Amount and description would be fetched from QR payments table in real implementation
          amount: 0, // Placeholder
          description: "QR Payment"
        }
      });

    } catch (error: any) {
      console.error('QR payment scan error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to scan QR payment code"
      });
    }
  });

  // Process QR payment
  app.post("/api/qr/process-payment", requireAuth, async (req, res) => {
    try {
      const { qrCode, amount, description } = req.body;
      const payerId = req.session!.userId!;

      if (!qrCode.startsWith('PAY_')) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR payment code"
        });
      }

      const qrParts = qrCode.split('_');
      const payeeId = parseInt(qrParts[2]);

      // Process wallet transfer
      const transferResult = await transactionService.processWalletTransfer(
        payerId,
        payeeId,
        amount,
        description || 'QR Payment'
      );

      if (!transferResult.success) {
        return res.status(400).json({
          success: false,
          message: transferResult.error
        });
      }

      // Emit real-time notification to payee
      if (global.io) {
        global.io.to(`user_${payeeId}`).emit('payment_received', {
          type: 'qr_payment',
          amount,
          payerId,
          transactionRef: transferResult.transferRef,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Payment processed successfully",
        transactionRef: transferResult.transferRef,
        transaction: transferResult.transaction
      });

    } catch (error: any) {
      console.error('QR payment processing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process QR payment"
      });
    }
  });

  // Generate QR code for delivery confirmation
  app.post("/api/qr/generate-delivery", requireAuth, async (req, res) => {
    try {
      const data = generateDeliveryQRSchema.parse(req.body);
      
      const qrConfirmation = await storage.generateDeliveryQR(data.orderId);

      res.json({
        success: true,
        qrCode: qrConfirmation.qrCode,
        orderId: data.orderId,
        createdAt: qrConfirmation.createdAt
      });

    } catch (error: any) {
      console.error('Delivery QR generation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to generate delivery QR code"
      });
    }
  });

  // Verify delivery QR code
  app.post("/api/qr/verify-delivery", requireAuth, async (req, res) => {
    try {
      const data = verifyDeliveryQRSchema.parse(req.body);
      
      const verification = await storage.verifyDeliveryQR(data.qrCode);

      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or already used QR code"
        });
      }

      // Update order status to delivered
      await storage.updateOrderTracking(verification.orderId, 'delivered');

      // Emit real-time notification
      if (global.io) {
        global.io.to(`order_${verification.orderId}`).emit('delivery_confirmed', {
          orderId: verification.orderId,
          confirmedAt: verification.scannedAt,
          qrCode: data.qrCode
        });
      }

      res.json({
        success: true,
        message: "Delivery confirmed successfully",
        orderId: verification.orderId,
        confirmedAt: verification.scannedAt
      });

    } catch (error: any) {
      console.error('Delivery QR verification error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to verify delivery QR code"
      });
    }
  });

  // Get QR payment history
  app.get("/api/qr/payment-history", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { limit = 50, offset = 0 } = req.query;

      const transactions = await storage.getUserTransactions(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // Filter for QR payments (you might want to add a specific type for this)
      const qrPayments = transactions.filter(t => 
        t.description && t.description.includes('QR Payment')
      );

      res.json({
        success: true,
        payments: qrPayments
      });

    } catch (error: any) {
      console.error('QR payment history error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch QR payment history"
      });
    }
  });
}