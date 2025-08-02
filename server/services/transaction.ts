import { db } from "../db";
import { storage } from "../storage";
import { paystackService } from "./paystack";
import { 
  transactions, wallets, paymentMethods, escrowTransactions, paymentNotifications,
  type Transaction, type InsertTransaction, type Wallet, type PaymentMethod,
  type EscrowTransaction, type InsertEscrowTransaction
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export interface TransactionInitiationParams {
  userId: number;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
  description?: string;
  metadata?: any;
  recipientId?: number;
  orderId?: string;
  paymentMethodId?: number;
  escrow?: boolean;
  autoRelease?: boolean;
  autoReleaseHours?: number;
}

export interface PaymentParams {
  userId: number;
  amount: number;
  email: string;
  orderId?: string;
  description?: string;
  metadata?: any;
  channels?: string[];
  split?: {
    sellerId: number;
    driverId?: number;
    sellerShare: number;
    driverShare?: number;
    platformFee: number;
  };
}

class TransactionService {
  // Initialize wallet for new user
  async initializeWallet(userId: number): Promise<Wallet> {
    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        balance: "0.00",
        currency: "NGN",
        isActive: true
      })
      .returning();
    
    return wallet;
  }

  // Get user wallet
  async getUserWallet(userId: number): Promise<Wallet | null> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));
    
    if (!wallet) {
      return await this.initializeWallet(userId);
    }
    
    return wallet;
  }

  // Update wallet balance
  async updateWalletBalance(userId: number, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const wallet = await this.getUserWallet(userId);
    if (!wallet) throw new Error('Wallet not found');

    const currentBalance = parseFloat(wallet.balance);
    const changeAmount = parseFloat(amount.toString());
    
    const newBalance = operation === 'add' 
      ? currentBalance + changeAmount 
      : currentBalance - changeAmount;

    if (newBalance < 0 && operation === 'subtract') {
      throw new Error('Insufficient wallet balance');
    }

    await db
      .update(wallets)
      .set({ 
        balance: newBalance.toFixed(2),
        lastActivity: new Date(),
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, userId));
  }

  // Generate unique transaction reference
  generateReference(): string {
    return `BP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // Initiate payment with Paystack
  async initiatePayment(params: PaymentParams) {
    try {
      const reference = this.generateReference();
      const amountInKobo = Math.round(params.amount * 100);

      // Create transaction record
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: params.userId,
          type: 'DEPOSIT',
          status: 'PENDING',
          amount: params.amount.toString(),
          fee: "0.00",
          netAmount: params.amount.toString(),
          currency: 'NGN',
          paystackReference: reference,
          description: params.description || 'Wallet funding',
          metadata: params.metadata,
          orderId: params.orderId,
          initiatedAt: new Date()
        })
        .returning();

      // Initialize Paystack transaction
      const paystackResponse = await paystackService.initializeTransaction({
        email: params.email,
        amount: amountInKobo,
        reference,
        metadata: {
          userId: params.userId,
          transactionId: transaction.id,
          orderId: params.orderId,
          ...params.metadata
        },
        channels: params.channels,
        callback_url: `${process.env.BASE_URL}/payment/callback`
      });

      if (!paystackResponse.success) {
        // Update transaction as failed
        await db
          .update(transactions)
          .set({ 
            status: 'FAILED',
            failedAt: new Date(),
            gatewayResponse: paystackResponse
          })
          .where(eq(transactions.id, transaction.id));

        throw new Error(paystackResponse.error || 'Payment initialization failed');
      }

      // Update transaction with Paystack details
      await db
        .update(transactions)
        .set({
          paystackAccessCode: paystackResponse.access_code,
          gatewayResponse: paystackResponse.data
        })
        .where(eq(transactions.id, transaction.id));

      // Handle escrow for orders
      if (params.split && params.orderId) {
        await this.createEscrowTransaction({
          transactionId: transaction.id,
          orderId: params.orderId,
          buyerId: params.userId,
          sellerId: params.split.sellerId,
          driverId: params.split.driverId,
          totalAmount: params.amount,
          sellerAmount: params.split.sellerShare,
          driverAmount: params.split.driverShare || 0,
          platformFee: params.split.platformFee
        });
      }

      return {
        success: true,
        transaction: transaction,
        authorization_url: paystackResponse.authorization_url,
        access_code: paystackResponse.access_code,
        reference: reference
      };

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  }

  // Verify and process payment
  async verifyPayment(reference: string) {
    try {
      // Get transaction from database
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.paystackReference, reference));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'SUCCESS') {
        return { success: true, transaction, message: 'Transaction already processed' };
      }

      // Verify with Paystack
      const verification = await paystackService.verifyTransaction(reference);

      if (!verification.success) {
        await db
          .update(transactions)
          .set({ 
            status: 'FAILED',
            failedAt: new Date(),
            gatewayResponse: verification
          })
          .where(eq(transactions.id, transaction.id));

        throw new Error(verification.error || 'Payment verification failed');
      }

      // Process successful payment
      if (verification.status === 'success') {
        await this.processSuccessfulPayment(transaction, verification.data);
        
        return { 
          success: true, 
          transaction: await this.getTransaction(transaction.id),
          message: 'Payment verified and processed successfully'
        };
      } else {
        await db
          .update(transactions)
          .set({ 
            status: 'FAILED',
            failedAt: new Date(),
            gatewayResponse: verification.data
          })
          .where(eq(transactions.id, transaction.id));

        throw new Error('Payment was not successful');
      }

    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Process successful payment
  private async processSuccessfulPayment(transaction: Transaction, gatewayData: any) {
    try {
      const fee = gatewayData.fees ? (gatewayData.fees / 100) : 0;
      const netAmount = parseFloat(transaction.amount) - fee;

      // Update transaction
      await db
        .update(transactions)
        .set({
          status: 'SUCCESS',
          fee: fee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          completedAt: new Date(),
          gatewayResponse: gatewayData,
          channel: gatewayData.channel,
          paystackTransactionId: gatewayData.id.toString()
        })
        .where(eq(transactions.id, transaction.id));

      // Update wallet balance for deposits
      if (transaction.type === 'DEPOSIT') {
        await this.updateWalletBalance(transaction.userId, netAmount, 'add');
      }

      // Save payment method if authorization provided
      if (gatewayData.authorization && gatewayData.authorization.reusable) {
        await this.savePaymentMethod(transaction.userId, gatewayData);
      }

      // Send notification
      await this.sendPaymentNotification(
        transaction.userId,
        transaction.id,
        'PAYMENT_SUCCESS',
        'Payment Successful',
        `Your payment of ₦${parseFloat(transaction.amount).toLocaleString()} was successful.`
      );

      // Handle escrow release if applicable
      const escrow = await this.getEscrowByTransactionId(transaction.id);
      if (escrow && escrow.status === 'HELD') {
        // Set auto-release timer if configured
        const autoReleaseHours = gatewayData.metadata?.autoReleaseHours || 24;
        const autoReleaseAt = new Date();
        autoReleaseAt.setHours(autoReleaseAt.getHours() + autoReleaseHours);

        await db
          .update(escrowTransactions)
          .set({ autoReleaseAt })
          .where(eq(escrowTransactions.id, escrow.id));
      }

    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Save payment method from authorization
  private async savePaymentMethod(userId: number, gatewayData: any) {
    try {
      const auth = gatewayData.authorization;
      const customer = gatewayData.customer;

      await db
        .insert(paymentMethods)
        .values({
          userId,
          type: 'CARD',
          provider: 'paystack',
          paystackCustomerId: customer.customer_code,
          paystackAuthCode: auth.authorization_code,
          cardBin: auth.bin,
          cardLast4: auth.last4,
          cardType: auth.card_type,
          cardBank: auth.bank,
          metadata: {
            brand: auth.brand,
            countryCode: auth.country_code,
            signature: auth.signature
          }
        })
        .onConflictDoNothing();

    } catch (error) {
      console.error('Error saving payment method:', error);
      // Don't throw - this is not critical
    }
  }

  // Create escrow transaction
  async createEscrowTransaction(params: {
    transactionId: string;
    orderId: string;
    buyerId: number;
    sellerId: number;
    driverId?: number;
    totalAmount: number;
    sellerAmount: number;
    driverAmount?: number;
    platformFee: number;
  }) {
    const [escrow] = await db
      .insert(escrowTransactions)
      .values({
        transactionId: params.transactionId,
        orderId: params.orderId,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        driverId: params.driverId,
        totalAmount: params.totalAmount.toString(),
        sellerAmount: params.sellerAmount.toString(),
        driverAmount: (params.driverAmount || 0).toString(),
        platformFee: params.platformFee.toString(),
        status: 'HELD'
      })
      .returning();

    return escrow;
  }

  // Release escrow funds
  async releaseEscrow(escrowId: number, releaseCondition: string, releasedBy?: number) {
    try {
      const [escrow] = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.id, escrowId));

      if (!escrow || escrow.status !== 'HELD') {
        throw new Error('Invalid escrow transaction');
      }

      // Create release transactions
      const sellerAmount = parseFloat(escrow.sellerAmount);
      const driverAmount = parseFloat(escrow.driverAmount);

      // Release to seller
      if (sellerAmount > 0) {
        await this.createTransaction({
          userId: escrow.sellerId,
          type: 'ESCROW_RELEASE',
          status: 'SUCCESS',
          amount: sellerAmount,
          description: `Escrow release for order ${escrow.orderId}`,
          metadata: { escrowId, releaseCondition }
        });

        await this.updateWalletBalance(escrow.sellerId, sellerAmount, 'add');
      }

      // Release to driver if applicable
      if (escrow.driverId && driverAmount > 0) {
        await this.createTransaction({
          userId: escrow.driverId,
          type: 'ESCROW_RELEASE',
          status: 'SUCCESS',
          amount: driverAmount,
          description: `Delivery payment for order ${escrow.orderId}`,
          metadata: { escrowId, releaseCondition }
        });

        await this.updateWalletBalance(escrow.driverId, driverAmount, 'add');
      }

      // Update escrow status
      await db
        .update(escrowTransactions)
        .set({
          status: escrow.driverId ? 'RELEASED_TO_DRIVER' : 'RELEASED_TO_SELLER',
          releaseCondition: releaseCondition as any,
          releasedAt: new Date(),
          disputeResolvedBy: releasedBy
        })
        .where(eq(escrowTransactions.id, escrowId));

      // Send notifications
      await this.sendPaymentNotification(
        escrow.sellerId,
        escrow.transactionId,
        'ESCROW_RELEASED',
        'Payment Released',
        `₦${sellerAmount.toLocaleString()} has been released to your wallet.`
      );

      if (escrow.driverId && driverAmount > 0) {
        await this.sendPaymentNotification(
          escrow.driverId,
          escrow.transactionId,
          'ESCROW_RELEASED',
          'Delivery Payment',
          `₦${driverAmount.toLocaleString()} delivery payment has been added to your wallet.`
        );
      }

      return { success: true, message: 'Escrow funds released successfully' };

    } catch (error: any) {
      console.error('Escrow release error:', error);
      throw error;
    }
  }

  // Create transaction record
  async createTransaction(params: {
    userId: number;
    recipientId?: number;
    type: string;
    status: string;
    amount: number;
    fee?: number;
    description?: string;
    metadata?: any;
    orderId?: string;
    paymentMethodId?: number;
  }) {
    const fee = params.fee || 0;
    const netAmount = params.amount - fee;

    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: params.userId,
        recipientId: params.recipientId,
        type: params.type as any,
        status: params.status as any,
        amount: params.amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        currency: 'NGN',
        description: params.description,
        metadata: params.metadata,
        orderId: params.orderId,
        paymentMethodId: params.paymentMethodId,
        initiatedAt: new Date(),
        completedAt: params.status === 'SUCCESS' ? new Date() : undefined
      })
      .returning();

    return transaction;
  }

  // Get transaction by ID
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    return transaction || null;
  }

  // Get user transactions
  async getUserTransactions(userId: number, limit: number = 50, offset: number = 0) {
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return userTransactions;
  }

  // Get escrow by transaction ID
  async getEscrowByTransactionId(transactionId: string): Promise<EscrowTransaction | null> {
    const [escrow] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.transactionId, transactionId));

    return escrow || null;
  }

  // Send payment notification
  async sendPaymentNotification(
    userId: number,
    transactionId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ) {
    try {
      await db
        .insert(paymentNotifications)
        .values({
          userId,
          transactionId,
          type: type as any,
          title,
          message,
          metadata
        });

      // TODO: Integrate with push notification service
      // TODO: Integrate with email service
      // TODO: Integrate with SMS service

    } catch (error) {
      console.error('Error sending payment notification:', error);
      // Don't throw - notifications are not critical
    }
  }

  // Charge saved payment method
  async chargePaymentMethod(params: {
    userId: number;
    paymentMethodId: number;
    amount: number;
    email: string;
    description?: string;
    metadata?: any;
  }) {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.id, params.paymentMethodId),
          eq(paymentMethods.userId, params.userId),
          eq(paymentMethods.isActive, true)
        ));

      if (!paymentMethod || !paymentMethod.paystackAuthCode) {
        throw new Error('Payment method not found or invalid');
      }

      const reference = this.generateReference();
      const amountInKobo = Math.round(params.amount * 100);

      // Create transaction record
      const transaction = await this.createTransaction({
        userId: params.userId,
        type: 'PAYMENT',
        status: 'PROCESSING',
        amount: params.amount,
        description: params.description,
        metadata: params.metadata,
        paymentMethodId: params.paymentMethodId
      });

      // Charge authorization with Paystack
      const chargeResponse = await paystackService.chargeAuthorization({
        authorization_code: paymentMethod.paystackAuthCode,
        email: params.email,
        amount: amountInKobo,
        reference,
        metadata: {
          userId: params.userId,
          transactionId: transaction.id,
          ...params.metadata
        }
      });

      if (!chargeResponse.success) {
        await db
          .update(transactions)
          .set({ 
            status: 'FAILED',
            failedAt: new Date(),
            gatewayResponse: chargeResponse
          })
          .where(eq(transactions.id, transaction.id));

        throw new Error(chargeResponse.error || 'Payment charge failed');
      }

      // Update transaction with charge details
      await db
        .update(transactions)
        .set({
          paystackReference: reference,
          paystackTransactionId: chargeResponse.data.id?.toString(),
          gatewayResponse: chargeResponse.data
        })
        .where(eq(transactions.id, transaction.id));

      // Verify the charge
      const verification = await this.verifyPayment(reference);

      return verification;

    } catch (error: any) {
      console.error('Payment method charge error:', error);
      throw error;
    }
  }

  // Get transaction analytics
  async getTransactionAnalytics(userId: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    try {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'daily':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7 * 12);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 12);
          break;
      }

      const analytics = await db
        .select({
          totalTransactions: sql<number>`count(*)`,
          totalVolume: sql<number>`sum(cast(amount as decimal))`,
          totalFees: sql<number>`sum(cast(fee as decimal))`,
          successfulTransactions: sql<number>`count(*) filter (where status = 'SUCCESS')`,
          failedTransactions: sql<number>`count(*) filter (where status = 'FAILED')`,
          avgTransactionValue: sql<number>`avg(cast(amount as decimal))`
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, startDate)
        ));

      return analytics[0] || {
        totalTransactions: 0,
        totalVolume: 0,
        totalFees: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        avgTransactionValue: 0
      };

    } catch (error) {
      console.error('Error getting transaction analytics:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
export default TransactionService;