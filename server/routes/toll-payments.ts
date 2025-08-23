import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, transactions, wallets } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { pgTable, text, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { transactionService } from "../services/transaction";
import { sanitizeInput, validateSchema } from "../middleware/validation";

const router = Router();

const tollPaymentSchema = z.object({
  tollGateId: z.string(),
  vehicleType: z.enum(['motorcycle', 'car', 'suv', 'truck']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['wallet', 'card']).default('wallet'),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const verifyQRSchema = z.object({
  qrCode: z.string().min(10).max(100).refine(
    (code) => code.startsWith('TOLL_'),
    { message: 'QR code must be a valid toll code' }
  )
});

// Define toll_gates table schema (add this to your shared/schema.ts if not exists)
const tollGates = pgTable('toll_gates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Get toll gates from database using Drizzle
async function getTollGateById(id: string) {
  try {
    const result = await db
      .select()
      .from(tollGates)
      .where(eq(tollGates.id, id))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching toll gate:', error);
    return null;
  }
}

async function getAllTollGates() {
  try {
    const result = await db
      .select()
      .from(tollGates)
      .where(eq(tollGates.isActive, true));
    
    return result;
  } catch (error) {
    console.error('Error fetching toll gates:', error);
    return [];
  }
}

// Process toll payment
router.post("/payment", sanitizeInput(), validateSchema(tollPaymentSchema), async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const validatedData = req.body;

    // Check if toll gate exists in database
    const tollGateInfo = await getTollGateById(validatedData.tollGateId);
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
router.get("/payments", async (req: any, res: any) => {
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
router.get("/gates", async (req: any, res: any) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    // Get toll gates from database
    const gates = await getAllTollGates();

    // Calculate distance if location provided
    const gatesWithDistance = gates.map(gate => {
      let distance = null;
      if (latitude && longitude && gate.latitude && gate.longitude) {
        const R = 6371; // Earth's radius in km
        const dLat = (gate.latitude - latitude) * Math.PI / 180;
        const dLon = (gate.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(latitude * Math.PI / 180) * Math.cos(gate.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = R * c;
      }

      return {
        ...gate,
        distance,
        paymentMethods: ['wallet', 'card', 'qr']
      };
    });

    // Filter by radius if location provided
    const filteredGates = latitude && longitude && radius
      ? gatesWithDistance.filter(gate => gate.distance === null || gate.distance <= radius)
      : gatesWithDistance;

    res.json({
      success: true,
      gates: filteredGates,
      metadata: {
        total: filteredGates.length,
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
router.post("/verify-qr", 
  sanitizeInput(),
  validateSchema(verifyQRSchema),
  async (req: any, res: any) => {
    try {
      const { qrCode } = req.body;

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
  }
);

export default router;