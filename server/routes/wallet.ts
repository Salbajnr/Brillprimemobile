
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { users, transactions, wallets } from '../../shared/schema';
import { eq, sum, and } from 'drizzle-orm';

const router = express.Router();

// Get wallet balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's wallet
    const wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    
    let balance = 0;
    if (wallet.length) {
      balance = wallet[0].balance || 0;
    } else {
      // Create wallet if it doesn't exist
      await db.insert(wallets).values({
        userId,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      data: { balance }
    });

  } catch (error) {
    console.error('Wallet balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// Fund wallet
router.post('/fund', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get or create wallet
    let wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    
    if (!wallet.length) {
      await db.insert(wallets).values({
        userId,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    }

    const currentBalance = wallet[0].balance || 0;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    await db.update(wallets)
      .set({ 
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId));

    // Record transaction
    await db.insert(transactions).values({
      userId,
      type: 'CREDIT',
      amount,
      status: 'SUCCESS',
      description: 'Wallet funding',
      reference: `FUND_${Date.now()}_${userId}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      data: { 
        balance: newBalance,
        message: 'Wallet funded successfully' 
      }
    });

  } catch (error) {
    console.error('Wallet funding error:', error);
    res.status(500).json({ error: 'Failed to fund wallet' });
  }
});

// Withdraw from wallet
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount, bankDetails } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get wallet
    const wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    
    if (!wallet.length) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = wallet[0].balance || 0;

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = currentBalance - amount;

    // Update wallet balance
    await db.update(wallets)
      .set({ 
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId));

    // Record transaction
    await db.insert(transactions).values({
      userId,
      type: 'DEBIT',
      amount,
      status: 'PENDING',
      description: 'Wallet withdrawal',
      reference: `WITHDRAW_${Date.now()}_${userId}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      data: { 
        balance: newBalance,
        message: 'Withdrawal request submitted successfully' 
      }
    });

  } catch (error) {
    console.error('Wallet withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(transactions.createdAt);

    res.json({
      success: true,
      data: userTransactions
    });

  } catch (error) {
    console.error('Transaction history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;
