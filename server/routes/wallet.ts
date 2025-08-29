import express from 'express';
import { db } from '../db';
import { transactions, orders, users, wallets } from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAuth, authenticateUser } from "../middleware/auth";

const router = express.Router();

// Define authenticateToken middleware for compatibility
const authenticateToken = requireAuth;


// Get wallet balance
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id; // Use authenticated user ID

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
        balance: '0', // Initialize balance as string '0'
        isActive: true, // Assuming new wallets are active by default
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

// Fund wallet - Initialize payment (using dummy implementation for now)
router.post('/fund', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount, email, paymentMethod = 'card' } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    // Get or create user wallet
    let userWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!userWallet.length) {
      [userWallet[0]] = await db
        .insert(wallets)
        .values({
          userId,
          balance: '0', // Initialize balance as string '0'
          isActive: true
        })
        .returning();
    }

    // Create funding transaction
    const fundingRef = `fund_${Date.now()}`;

    const [transaction] = await db.insert(transactions).values({
      userId,
      amount: amount.toString(),
      type: 'Wallet_FUNDING',
      status: 'PENDING',
      paymentMethod,
      paymentStatus: 'PENDING',
      transactionRef: fundingRef,
      description: 'Wallet funding',
      metadata: { email, paymentMethod },
      createdAt: new Date()
    }).returning();

    // For demo purposes, auto-complete the funding
    // In production, this would integrate with Paystack or other payment gateways
    await Promise.all([
      // Update transaction as completed
      db.update(transactions)
        .set({
          status: 'COMPLETED',
          paymentStatus: 'COMPLETED',
          completedAt: new Date()
        })
        .where(eq(transactions.id, transaction.id)),

      // Update wallet balance
      db.update(wallets)
        .set({
          balance: (parseFloat(userWallet[0].balance) + amount).toString(),
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, userId))
    ]);

    res.json({
      success: true,
      message: 'Wallet funded successfully',
      data: {
        reference: fundingRef,
        amount,
        newBalance: (parseFloat(userWallet[0].balance) + amount).toString()
      }
    });
  } catch (error) {
    console.error('Wallet fund error:', error);
    res.status(500).json({ success: false, error: 'Funding failed' });
  }
});

// Verify wallet funding payment (This endpoint might need adjustment if Paystack integration is implemented)
router.post('/fund/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { reference } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference required' });
    }

    // In a real scenario, you would verify the transaction with the payment gateway (e.g., Paystack)
    // For this example, we'll assume the transaction is already processed and look it up
    const [transaction] = await db.select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.transactionRef, reference)))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'COMPLETED') {
      const amount = parseFloat(transaction.amount);
      res.json({
        success: true,
        data: {
          balance: transaction.updatedBalance || amount, // Assuming updatedBalance might be stored, otherwise use amount
          amount,
          message: 'Wallet funded successfully'
        }
      });
    } else if (transaction.status === 'PENDING') {
      // If still pending, you might want to re-attempt verification or inform the user
      res.status(400).json({ error: 'Payment is still pending verification' });
    }
    else {
      res.status(400).json({ error: 'Payment verification failed or transaction not successful' });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});


// Withdraw from wallet
router.post('/withdraw', requireAuth, async (req, res) => {
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

    // Placeholder for bank account validation and transfer initiation
    // In a real application, you would use a payment gateway API here (e.g., Paystack)

    // Simulate account validation
    const accountValidation = {
      success: true,
      account_name: "Simulated Account Name",
      account_number: bankDetails.accountNumber
    };

    // Simulate transfer initiation
    const transferResult = {
      success: true,
      transfer_code: `TXN_${Date.now()}`,
      reference: `WITHDRAW_${Date.now()}_${userId}`
    };

    if (!accountValidation.success) {
      return res.status(400).json({ error: 'Invalid bank account details' });
    }

    const newBalance = currentBalance - amount;
    const withdrawalRef = transferResult.reference;

    // Update wallet balance
    await db.update(wallets)
      .set({
        balance: newBalance.toString(),
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId));

    // Record transaction
    const [transaction] = await db.insert(transactions).values({
      userId,
      amount: amount.toString(),
      type: 'WITHDRAWAL',
      status: 'PENDING', // Status could be PENDING, PROCESSING, COMPLETED, FAILED
      amount: amount.toString(),
      netAmount: amount.toString(),
      currency: 'NGN',
      description: `Wallet withdrawal to ${accountValidation.account_name}`,
      transactionRef: withdrawalRef, // Use a consistent reference
      metadata: {
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          bankCode: bankDetails.bankCode,
          accountName: accountValidation.account_name
        },
        // recipientCode: recipientResult.recipient_code // If using a service that provides this
      },
      initiatedAt: new Date()
    }).returning();

    // Initiate transfer (simulated)
    // In a real scenario, you'd call the payment gateway's transfer initiation API here
    // For now, we'll just update the transaction status to PROCESSING if the simulated transfer was successful
    if (transferResult.success) {
      await db.update(transactions)
        .set({
          status: 'PROCESSING',
          paystackTransactionId: transferResult.transfer_code, // Store gateway transaction ID if available
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transaction.id));
    } else {
       await db.update(transactions)
        .set({
          status: 'FAILED',
          description: 'Wallet withdrawal - transfer initiation failed',
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transaction.id));
       return res.status(500).json({ error: 'Failed to initiate withdrawal transfer' });
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

// Get available banks (Placeholder, real implementation would fetch from payment gateway)
router.get('/banks', requireAuth, async (req, res) => {
  try {
    // In a real application, you would fetch this from Paystack or another provider
    const simulatedBanks = [
      { code: '044', name: 'Access Bank' },
      { code: '057', name: 'Zenith Bank' },
      { code: '070', name: 'Fidelity Bank' },
      // ... add more banks
    ];

    res.json({
      success: true,
      data: simulatedBanks
    });

  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// Validate bank account (Placeholder, real implementation would use payment gateway)
router.post('/validate-account', requireAuth, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Account number and bank code required' });
    }

    // Simulate account validation
    const validationResult = {
      success: true,
      account_name: "Simulated Account Name",
      account_number: accountNumber,
      bank_code: bankCode
    };

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
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(transactions.createdAt); // Order by creation date, newest first might be better

    res.json({
      success: true,
      data: userTransactions
    });

  } catch (error) {
    console.error('Transaction history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Transfer between wallets
router.post('/transfer', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { recipientId, amount, description } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid transfer details' });
    }

    // Check sender's wallet balance
    const senderWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!senderWallet.length || parseFloat(senderWallet[0].balance) < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Check recipient exists
    const recipient = await db
      .select()
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!recipient.length) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Get or create recipient wallet
    let recipientWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, recipientId))
      .limit(1);

    if (!recipientWallet.length) {
      [recipientWallet[0]] = await db
        .insert(wallets)
        .values({
          userId: recipientId,
          balance: '0',
          isActive: true
        })
        .returning();
    }

    // Perform transfer
    const transferRef = `transfer_${Date.now()}`;

    // Debit sender
    await db
      .update(wallets)
      .set({
        balance: (parseFloat(senderWallet[0].balance) - amount).toString(),
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId));

    // Credit recipient
    await db
      .update(wallets)
      .set({
        balance: (parseFloat(recipientWallet[0].balance) + amount).toString(),
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, recipientId));

    // Record transactions
    await Promise.all([
      // Debit transaction
      db.insert(transactions).values({
        userId,
        recipientId,
        amount: amount.toString(),
        type: 'TRANSFER_OUT',
        status: 'COMPLETED',
        paymentMethod: 'wallet',
        paymentStatus: 'COMPLETED',
        transactionRef: transferRef,
        description: description || 'Wallet transfer',
        completedAt: new Date(),
        createdAt: new Date()
      }),
      // Credit transaction
      db.insert(transactions).values({
        userId: recipientId,
        recipientId: userId,
        amount: amount.toString(),
        type: 'TRANSFER_IN',
        status: 'COMPLETED',
        paymentMethod: 'wallet',
        paymentStatus: 'COMPLETED',
        transactionRef: transferRef,
        description: description || 'Wallet transfer received',
        completedAt: new Date(),
        createdAt: new Date()
      })
    ]);

    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        reference: transferRef,
        amount,
        recipient: recipient[0].fullName // Assuming 'fullName' is a field in the users table
      }
    });
  } catch (error) {
    console.error('Wallet transfer error:', error);
    res.status(500).json({ success: false, error: 'Transfer failed' });
  }
});


export default router;