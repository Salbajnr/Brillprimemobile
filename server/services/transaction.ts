import { storage } from '../storage';
import { paystackService } from './paystack';
import { db } from '../db';
import { transactions, wallets } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface PaymentInitiationParams {
  userId: number;
  amount: number;
  email: string;
  description?: string;
  orderId?: string;
  channels?: string[];
  split?: any;
  metadata?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  transaction?: any;
  error?: string;
}

class TransactionService {
  /**
   * Initiate a payment transaction
   */
  async initiatePayment(params: PaymentInitiationParams) {
    try {
      // Create transaction record
      const transactionRef = `TXN_${Date.now()}_${params.userId}`;
      const amountInKobo = Math.round(params.amount * 100);

      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: params.userId,
          type: 'PAYMENT',
          status: 'PENDING',
          amount: params.amount.toString(),
          netAmount: params.amount.toString(),
          currency: 'NGN',
          description: params.description || 'Payment transaction',
          paystackReference: transactionRef,
          orderId: params.orderId,
          metadata: params.metadata,
          initiatedAt: new Date()
        })
        .returning();

      // Initialize with Paystack
      const paystackResult = await paystackService.initializeTransaction({
        email: params.email,
        amount: amountInKobo,
        reference: transactionRef,
        metadata: {
          ...params.metadata,
          userId: params.userId,
          transactionId: transaction.id
        },
        channels: params.channels || ['card', 'bank', 'ussd', 'qr'],
        split_code: params.split?.split_code
      });

      if (!paystackResult.success) {
        // Update transaction status to failed
        await db
          .update(transactions)
          .set({
            status: 'FAILED',
            failedAt: new Date()
          })
          .where(eq(transactions.id, transaction.id));

        return {
          success: false,
          error: paystackResult.error,
          transactionId: transaction.id
        };
      }

      // Update transaction with Paystack details
      await db
        .update(transactions)
        .set({
          paystackAccessCode: paystackResult.access_code,
          paystackTransactionId: paystackResult.data?.id
        })
        .where(eq(transactions.id, transaction.id));

      return {
        success: true,
        transactionId: transaction.id,
        reference: transactionRef,
        authorization_url: paystackResult.authorization_url,
        access_code: paystackResult.access_code
      };

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment'
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      // Get transaction from database
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.paystackReference, reference));

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      // Verify with Paystack
      const paystackResult = await paystackService.verifyTransaction(reference);

      if (!paystackResult.success) {
        return {
          success: false,
          error: paystackResult.error,
          transaction
        };
      }

      // Update transaction status
      const status = paystackResult.status === 'success' ? 'SUCCESS' : 'FAILED';
      const updateData: any = {
        status,
        gatewayResponse: paystackResult.data
      };

      if (status === 'SUCCESS') {
        updateData.completedAt = new Date();
      } else {
        updateData.failedAt = new Date();
      }

      const [updatedTransaction] = await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, transaction.id))
        .returning();

      // If successful and it's a wallet deposit, update wallet balance
      if (status === 'SUCCESS' && transaction.type === 'DEPOSIT') {
        await this.updateWalletBalance(transaction.userId, parseFloat(transaction.amount));
      }

      return {
        success: status === 'SUCCESS',
        transaction: updatedTransaction
      };

    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify payment'
      };
    }
  }

  /**
   * Update wallet balance
   */
  private async updateWalletBalance(userId: number, amount: number) {
    try {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId));

      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + amount;
        await db
          .update(wallets)
          .set({
            balance: newBalance.toString(),
            lastUpdated: new Date()
          })
          .where(eq(wallets.id, wallet.id));
      }
    } catch (error) {
      console.error('Wallet balance update error:', error);
    }
  }

  /**
   * Process wallet transfer
   */
  async processWalletTransfer(fromUserId: number, toUserId: number, amount: number, description?: string) {
    try {
      // Get sender wallet
      const [senderWallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, fromUserId));

      if (!senderWallet || parseFloat(senderWallet.balance) < amount) {
        return {
          success: false,
          error: 'Insufficient balance'
        };
      }

      // Create transfer transaction
      const transferRef = `TRANSFER_${Date.now()}_${fromUserId}_${toUserId}`;

      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: fromUserId,
          recipientId: toUserId,
          type: 'TRANSFER',
          status: 'SUCCESS',
          amount: amount.toString(),
          netAmount: amount.toString(),
          currency: 'NGN',
          description: description || 'Wallet transfer',
          paystackReference: transferRef,
          completedAt: new Date()
        })
        .returning();

      // Update sender balance
      const newSenderBalance = parseFloat(senderWallet.balance) - amount;
      await db
        .update(wallets)
        .set({
          balance: newSenderBalance.toString(),
          lastUpdated: new Date()
        })
        .where(eq(wallets.id, senderWallet.id));

      // Update receiver balance
      await this.updateWalletBalance(toUserId, amount);

      return {
        success: true,
        transaction,
        transferRef
      };

    } catch (error: any) {
      console.error('Wallet transfer error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process transfer'
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId: string, amount?: number, reason?: string) {
    try {
      const [originalTransaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!originalTransaction) {
        return {
          success: false,
          error: 'Original transaction not found'
        };
      }

      const refundAmount = amount || parseFloat(originalTransaction.amount);
      const refundRef = `REFUND_${Date.now()}_${transactionId}`;

      // Create refund transaction
      const [refundTransaction] = await db
        .insert(transactions)
        .values({
          userId: originalTransaction.userId,
          type: 'REFUND',
          status: 'SUCCESS',
          amount: refundAmount.toString(),
          netAmount: refundAmount.toString(),
          currency: 'NGN',
          description: reason || 'Transaction refund',
          paystackReference: refundRef,
          orderId: originalTransaction.orderId,
          completedAt: new Date()
        })
        .returning();

      // Update wallet balance
      await this.updateWalletBalance(originalTransaction.userId, refundAmount);

      return {
        success: true,
        refundTransaction,
        refundRef
      };

    } catch (error: any) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process refund'
      };
    }
  }
}

export const transactionService = new TransactionService();