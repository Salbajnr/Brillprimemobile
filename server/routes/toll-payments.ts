
import type { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, transactions, wallets } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { transactionService } from "../services/transaction";

const tollPaymentSchema = z.object({
  tollGateId: z.string(),
  vehicleType: z.enum(['motorcycle', 'car', 'suv', 'truck']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['wallet', 'card']).default('wallet'),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const tollGatesData = {
  "lagos-ibadan-1": {
    name: "Lagos-Ibadan Expressway Toll",
    location: "Berger, Lagos",
    operator: "Lagos State Government"
  },
  "lekki-toll": {
    name: "Lekki Toll Gate",
    location: "Lekki Peninsula, Lagos",
    operator: "Lekki Concession Company"
  },
  "abuja-kaduna-1": {
    name: "Abuja-Kaduna Expressway Toll",
    location: "Zuba, Abuja",
    operator: "Federal Government"
  }
};

export function registerTollPaymentRoutes(app: Express) {
  // Process toll payment
  app.post("/api/toll/payment", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = tollPaymentSchema.parse(req.body);

      // Check if toll gate exists
      const tollGateInfo = tollGatesData[validatedData.tollGateId as keyof typeof tollGatesData];
      if (!tollGateInfo) {
        return res.status(400).json({ success: false, error: 'Invalid toll gate' });
      }

      // Check wallet balance if using wallet payment
      if (validatedData.paymentMethod === 'wallet') {
        const wallet = await db
          .select()
          .from(wallets)
          .where(eq(wallets.userId, userId))
          .limit(1);

        if (!wallet.length || parseFloat(wallet[0].balance) < validatedData.amount) {
          return res.status(400).json({ 
            success: false, 
            error: 'Insufficient wallet balance' 
          });
        }

        // Deduct from wallet
        await transactionService.updateWalletBalance(userId, validatedData.amount, 'subtract');
      }

      // Create transaction record
      const transaction = await db.insert(transactions).values({
        userId,
        type: 'TOLL_PAYMENT',
        status: 'SUCCESS',
        amount: validatedData.amount.toString(),
        fee: "0.00",
        netAmount: validatedData.amount.toString(),
        description: `Toll payment at ${tollGateInfo.name}`,
        metadata: {
          tollGateId: validatedData.tollGateId,
          vehicleType: validatedData.vehicleType,
          tollGateName: tollGateInfo.name,
          location: tollGateInfo.location,
          paymentMethod: validatedData.paymentMethod
        },
        completedAt: new Date()
      }).returning();

      // Generate QR code for toll gate scanning
      const qrCode = `TOLL_${validatedData.tollGateId}_${transaction[0].id}_${Date.now()}`;

      // Real-time notifications
      if (global.io) {
        // Notify user
        global.io.to(`user_${userId}`).emit('toll_payment_success', {
          type: 'TOLL_PAYMENT_SUCCESS',
          transaction: transaction[0],
          tollGate: tollGateInfo,
          qrCode,
          message: `Toll payment successful at ${tollGateInfo.name}`,
          timestamp: Date.now()
        });

        // Update wallet balance in real-time
        const updatedWallet = await db
          .select()
          .from(wallets)
          .where(eq(wallets.userId, userId))
          .limit(1);

        global.io.to(`user_${userId}`).emit('wallet_balance_update', {
          balance: updatedWallet[0]?.balance || '0.00',
          currency: updatedWallet[0]?.currency || 'NGN',
          lastTransaction: transaction[0],
          timestamp: Date.now()
        });

        // Notify admin monitoring
        global.io.to('admin_monitoring').emit('toll_payment_activity', {
          type: 'TOLL_PAYMENT_PROCESSED',
          userId,
          tollGateId: validatedData.tollGateId,
          amount: validatedData.amount,
          vehicleType: validatedData.vehicleType,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        transaction: transaction[0],
        qrCode,
        tollGate: tollGateInfo,
        message: 'Toll payment processed successfully'
      });

    } catch (error: any) {
      console.error('Error processing toll payment:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Failed to process toll payment' });
    }
  });

  // Get toll payment history
  app.get("/api/toll/payments", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const tollPayments = await db
        .select()
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'TOLL_PAYMENT')
        ))
        .orderBy(transactions.createdAt)
        .limit(parseInt(limit))
        .offset(offset);

      res.json({
        success: true,
        payments: tollPayments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tollPayments.length
        }
      });

    } catch (error) {
      console.error('Error fetching toll payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch toll payments' });
    }
  });

  // Get toll gates
  app.get("/api/toll/gates", async (req: any, res: any) => {
    try {
      const { latitude, longitude, radius = 50 } = req.query;

      // Return all toll gates with distance calculation if location provided
      const gates = Object.entries(tollGatesData).map(([id, info]) => ({
        id,
        ...info,
        pricePerVehicle: {
          motorcycle: id === 'lekki-toll' ? 120 : id === 'abuja-kaduna-1' ? 150 : 200,
          car: id === 'lekki-toll' ? 400 : id === 'abuja-kaduna-1' ? 500 : 600,
          suv: id === 'lekki-toll' ? 800 : id === 'abuja-kaduna-1' ? 900 : 1000,
          truck: id === 'lekki-toll' ? 1200 : id === 'abuja-kaduna-1' ? 1400 : 1500
        },
        operatingHours: id === 'abuja-kaduna-1' ? '6:00 AM - 10:00 PM' : '24/7',
        isOpen: true,
        paymentMethods: ['wallet', 'card', 'qr'],
        trafficStatus: id === 'abuja-kaduna-1' ? 'heavy' : id === 'lagos-ibadan-1' ? 'moderate' : 'light',
        queueTime: id === 'abuja-kaduna-1' ? '10-15 minutes' : id === 'lagos-ibadan-1' ? '5-8 minutes' : '2-3 minutes'
      }));

      res.json({
        success: true,
        gates,
        metadata: {
          total: gates.length,
          searchRadius: radius,
          userLocation: latitude && longitude ? { latitude, longitude } : null
        }
      });

    } catch (error) {
      console.error('Error fetching toll gates:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch toll gates' });
    }
  });

  // Verify toll QR code
  app.post("/api/toll/verify-qr", async (req: any, res: any) => {
    try {
      const { qrCode } = req.body;

      if (!qrCode || !qrCode.startsWith('TOLL_')) {
        return res.status(400).json({ success: false, error: 'Invalid QR code' });
      }

      // Parse QR code to extract transaction info
      const qrParts = qrCode.split('_');
      if (qrParts.length < 4) {
        return res.status(400).json({ success: false, error: 'Invalid QR code format' });
      }

      const [, tollGateId, transactionId] = qrParts;

      // Verify transaction exists and is valid
      const transaction = await db
        .select()
        .from(transactions)
        .where(and(
          eq(transactions.id, parseInt(transactionId)),
          eq(transactions.type, 'TOLL_PAYMENT'),
          eq(transactions.status, 'SUCCESS')
        ))
        .limit(1);

      if (!transaction.length) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      const tollGateInfo = tollGatesData[tollGateId as keyof typeof tollGatesData];

      res.json({
        success: true,
        transaction: transaction[0],
        tollGate: tollGateInfo,
        isValid: true,
        message: 'QR code verified successfully'
      });

    } catch (error) {
      console.error('Error verifying QR code:', error);
      res.status(500).json({ success: false, error: 'Failed to verify QR code' });
    }
  });
}
