
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

// Fund wallet - Initialize payment
router.post('/fund', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user details for payment
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user[0].email,
        amount: amount * 100, // Convert to kobo
        reference: `WALLET_FUND_${Date.now()}_${userId}`,
        callback_url: `${process.env.FRONTEND_URL}/wallet-fund/callback`,
        metadata: {
          userId,
          type: 'wallet_funding',
          paymentMethod
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (paystackData.status) {
      // Store pending transaction
      await db.insert(transactions).values({
        userId,
        type: 'CREDIT',
        amount,
        status: 'PENDING',
        description: 'Wallet funding - pending payment',
        reference: paystackData.data.reference,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.json({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference
      });
    } else {
      throw new Error(paystackData.message || 'Payment initialization failed');
    }

  } catch (error) {
    console.error('Wallet funding error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// Verify wallet funding payment
router.post('/fund/verify', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.user?.id;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference required' });
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.status && verifyData.data.status === 'success') {
      const amount = verifyData.data.amount / 100; // Convert from kobo

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

      // Update transaction status
      await db.update(transactions)
        .set({ 
          status: 'SUCCESS',
          description: 'Wallet funding - completed',
          updatedAt: new Date()
        })
        .where(eq(transactions.reference, reference));

      res.json({
        success: true,
        data: { 
          balance: newBalance,
          amount,
          message: 'Wallet funded successfully' 
        }
      });
    } else {
      // Update transaction as failed
      await db.update(transactions)
        .set({ 
          status: 'FAILED',
          description: 'Wallet funding - payment failed',
          updatedAt: new Date()
        })
        .where(eq(transactions.reference, reference));

      res.status(400).json({ error: 'Payment verification failed' });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
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

    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankCode) {
      return res.status(400).json({ error: 'Bank details required' });
    }

    // Get wallet
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallet.balance);

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Validate bank account
    const accountValidation = await paystackService.resolveAccountNumber(
      bankDetails.accountNumber,
      bankDetails.bankCode
    );

    if (!accountValidation.success) {
      return res.status(400).json({ error: 'Invalid bank account details' });
    }

    // Create transfer recipient
    const recipientResult = await paystackService.createTransferRecipient({
      type: 'nuban',
      name: accountValidation.account_name,
      account_number: bankDetails.accountNumber,
      bank_code: bankDetails.bankCode,
      currency: 'NGN'
    });

    if (!recipientResult.success) {
      return res.status(400).json({ error: 'Failed to create transfer recipient' });
    }

    const newBalance = currentBalance - amount;
    const withdrawalRef = `WITHDRAW_${Date.now()}_${userId}`;

    // Update wallet balance
    await db.update(wallets)
      .set({ 
        balance: newBalance.toString(),
        lastUpdated: new Date()
      })
      .where(eq(wallets.userId, userId));

    // Record transaction
    const [transaction] = await db.insert(transactions).values({
      userId,
      type: 'WITHDRAWAL',
      status: 'PENDING',
      amount: amount.toString(),
      netAmount: amount.toString(),
      currency: 'NGN',
      description: `Wallet withdrawal to ${accountValidation.account_name}`,
      paystackReference: withdrawalRef,
      metadata: {
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          bankCode: bankDetails.bankCode,
          accountName: accountValidation.account_name
        },
        recipientCode: recipientResult.recipient_code
      },
      initiatedAt: new Date()
    }).returning();

    // Initiate transfer
    const transferResult = await paystackService.initiateTransfer({
      source: 'balance',
      amount: amount * 100, // Convert to kobo
      recipient: recipientResult.recipient_code,
      reason: 'Wallet withdrawal',
      reference: withdrawalRef
    });

    if (transferResult.success) {
      await db.update(transactions)
        .set({
          status: 'PROCESSING',
          paystackTransactionId: transferResult.transfer_code,
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transaction.id));
    }

    res.json({
      success: true,
      data: { 
        balance: newBalance,
        transactionId: transaction.id,
        reference: withdrawalRef,
        message: 'Withdrawal request submitted successfully' 
      }
    });

  } catch (error) {
    console.error('Wallet withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get available banks
router.get('/banks', authenticateToken, async (req, res) => {
  try {
    const banksResult = await paystackService.getBanks();
    
    if (!banksResult.success) {
      return res.status(500).json({ error: 'Failed to fetch banks' });
    }

    res.json({
      success: true,
      data: banksResult.data
    });

  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// Validate bank account
router.post('/validate-account', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Account number and bank code required' });
    }

    const validationResult = await paystackService.resolveAccountNumber(accountNumber, bankCode);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid account details' });
    }

    res.json({
      success: true,
      data: {
        accountName: validationResult.account_name,
        accountNumber: validationResult.account_number
      }
    });

  } catch (error) {
    console.error('Account validation error:', error);
    res.status(500).json({ error: 'Failed to validate account' });
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
