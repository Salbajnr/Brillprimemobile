
import express from 'express';
import { db } from '../db';
import { wallets, transactions, users } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { requireAuth as authenticateToken } from '../middleware/auth';
import { paystack } from '../services/paystack';

const router = express.Router();

// Get user's bank accounts
router.get('/bank-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId!));
    
    if (!user?.bankAccounts) {
      return res.json({ accounts: [] });
    }
    
    res.json({ accounts: user.bankAccounts });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// Add/verify bank account
router.post('/verify-account', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    const userId = req.user?.id;
    
    // Verify account with Paystack
    const verification = await paystack.verifyAccount(accountNumber, bankCode);
    
    if (!verification.status) {
      return res.status(400).json({ error: 'Account verification failed' });
    }
    
    const accountInfo = {
      accountNumber,
      bankCode,
      accountName: verification.data.account_name,
      bankName: verification.data.bank_name,
      verified: true,
      createdAt: new Date()
    };
    
    // Update user's bank accounts
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId!));
    
    const existingAccounts = user?.bankAccounts || [];
    const updatedAccounts = [...existingAccounts, accountInfo];
    
    await db
      .update(users)
      .set({ 
        bankAccounts: updatedAccounts,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId!));
    
    res.json({ 
      success: true, 
      account: accountInfo,
      message: 'Bank account verified successfully'
    });
  } catch (error) {
    console.error('Account verification error:', error);
    res.status(500).json({ error: 'Failed to verify account' });
  }
});

// Initiate withdrawal
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, accountNumber, bankCode, reason } = req.body;
    const userId = req.user?.id;
    
    // Validate amount
    if (amount < 100) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is ₦100' });
    }
    
    // Check wallet balance
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId!));
    
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    
    // Check daily withdrawal limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayWithdrawals = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId!),
        eq(transactions.type, 'WITHDRAWAL'),
        gte(transactions.createdAt, todayStart),
        eq(transactions.status, 'COMPLETED')
      ));
    
    const dailyLimit = 50000; // ₦50,000 daily limit
    if ((todayWithdrawals[0]?.total || 0) + amount > dailyLimit) {
      return res.status(400).json({ error: 'Daily withdrawal limit exceeded' });
    }
    
    // Create withdrawal transaction
    const reference = `withdrawal_${userId}_${Date.now()}`;
    
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: userId!,
        type: 'WITHDRAWAL',
        amount: -amount, // Negative for withdrawal
        status: 'PENDING',
        reference,
        description: reason || 'Wallet withdrawal',
        paystackData: { accountNumber, bankCode },
        createdAt: new Date()
      })
      .returning();
    
    // Deduct from wallet (will be restored if withdrawal fails)
    await db
      .update(wallets)
      .set({ 
        balance: sql`balance - ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId!));
    
    // Initiate transfer with Paystack
    try {
      const transferResult = await paystack.initiateTransfer({
        amount: amount * 100, // Convert to kobo
        recipient: accountNumber,
        bankCode,
        reference,
        reason: reason || 'Wallet withdrawal'
      });
      
      if (transferResult.status) {
        // Update transaction with Paystack reference
        await db
          .update(transactions)
          .set({ 
            paystackReference: transferResult.data.transfer_code,
            status: 'PROCESSING'
          })
          .where(eq(transactions.id, transaction.id));
        
        res.json({
          success: true,
          message: 'Withdrawal initiated successfully',
          reference,
          transferCode: transferResult.data.transfer_code
        });
      } else {
        throw new Error('Paystack transfer initiation failed');
      }
    } catch (transferError) {
      // Restore wallet balance if transfer fails
      await db
        .update(wallets)
        .set({ 
          balance: sql`balance + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, userId!));
      
      // Update transaction status
      await db
        .update(transactions)
        .set({ status: 'FAILED' })
        .where(eq(transactions.id, transaction.id));
      
      throw transferError;
    }
    
  } catch (error) {
    console.error('Withdrawal initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate withdrawal' });
  }
});

// Get withdrawal history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const withdrawals = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId!),
        eq(transactions.type, 'WITHDRAWAL')
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId!),
        eq(transactions.type, 'WITHDRAWAL')
      ));
    
    res.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Withdrawal history error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

export default router;
