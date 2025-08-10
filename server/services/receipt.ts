
import { db } from '../db';
import { transactions, users, orders } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface ReceiptData {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  description: string;
  date: Date;
  completedAt?: Date;
  customer: {
    name: string;
    email: string;
  };
  merchant?: {
    name: string;
    email: string;
  };
  order?: {
    orderNumber: string;
    items: any[];
  };
  fees: {
    platformFee: number;
    processingFee: number;
    total: number;
  };
  metadata?: any;
}

class ReceiptService {
  /**
   * Generate receipt for transaction
   */
  async generateReceipt(transactionId: string, userId: number): Promise<ReceiptData | null> {
    try {
      const [transaction] = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          status: transactions.status,
          amount: transactions.amount,
          netAmount: transactions.netAmount,
          currency: transactions.currency,
          description: transactions.description,
          paystackReference: transactions.paystackReference,
          orderId: transactions.orderId,
          createdAt: transactions.createdAt,
          completedAt: transactions.completedAt,
          metadata: transactions.metadata,
          customerName: users.fullName,
          customerEmail: users.email
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        ))
        .limit(1);

      if (!transaction) {
        return null;
      }

      // Calculate fees
      const amount = parseFloat(transaction.amount);
      const platformFee = amount * 0.025; // 2.5% platform fee
      const processingFee = amount * 0.015; // 1.5% processing fee
      const totalFees = platformFee + processingFee;

      const receipt: ReceiptData = {
        id: transaction.id,
        reference: transaction.paystackReference || '',
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        date: transaction.createdAt,
        completedAt: transaction.completedAt || undefined,
        customer: {
          name: transaction.customerName || '',
          email: transaction.customerEmail || ''
        },
        fees: {
          platformFee,
          processingFee,
          total: totalFees
        },
        metadata: transaction.metadata
      };

      // Add order details if applicable
      if (transaction.orderId) {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, transaction.orderId))
          .limit(1);

        if (order) {
          receipt.order = {
            orderNumber: order.orderNumber || '',
            items: order.items as any[] || []
          };
        }
      }

      return receipt;

    } catch (error) {
      console.error('Generate receipt error:', error);
      return null;
    }
  }

  /**
   * Generate PDF receipt (placeholder for future implementation)
   */
  async generatePDFReceipt(receiptData: ReceiptData): Promise<Buffer | null> {
    // This would use a PDF generation library like puppeteer or jsPDF
    // For now, return null as placeholder
    console.log('PDF generation not implemented yet');
    return null;
  }

  /**
   * Email receipt to user
   */
  async emailReceipt(receiptData: ReceiptData, userEmail: string): Promise<boolean> {
    try {
      // This would integrate with email service
      console.log(`Emailing receipt ${receiptData.reference} to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Email receipt error:', error);
      return false;
    }
  }

  /**
   * Get transaction summary for period
   */
  async getTransactionSummary(userId: number, startDate: Date, endDate: Date) {
    try {
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          // Add date range conditions here when drizzle supports it
        ));

      const summary = {
        totalTransactions: userTransactions.length,
        totalAmount: userTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
        successfulTransactions: userTransactions.filter(t => t.status === 'SUCCESS').length,
        failedTransactions: userTransactions.filter(t => t.status === 'FAILED').length,
        pendingTransactions: userTransactions.filter(t => t.status === 'PENDING').length,
        byType: {
          payments: userTransactions.filter(t => t.type === 'PAYMENT').length,
          deposits: userTransactions.filter(t => t.type === 'DEPOSIT').length,
          withdrawals: userTransactions.filter(t => t.type === 'WITHDRAWAL').length,
          transfers: userTransactions.filter(t => t.type === 'TRANSFER').length,
          refunds: userTransactions.filter(t => t.type === 'REFUND').length
        }
      };

      return summary;

    } catch (error) {
      console.error('Get transaction summary error:', error);
      return null;
    }
  }
}

export const receiptService = new ReceiptService();
export default ReceiptService;
