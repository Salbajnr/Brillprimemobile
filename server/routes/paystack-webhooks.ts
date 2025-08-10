
import express from 'express';
import { db } from '../db';
import { transactions, wallets, orders, escrowTransactions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { broadcastOrderUpdate } from '../services/order-broadcasting';

const router = express.Router();

// Middleware to verify Paystack webhook signature
const verifyPaystackWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash === req.headers['x-paystack-signature']) {
    next();
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
};

// Webhook endpoint for payment confirmations
router.post('/webhook', express.raw({ type: 'application/json' }), verifyPaystackWebhook, async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    
    switch (event.event) {
      case 'charge.success':
        await handlePaymentSuccess(event.data);
        break;
      case 'charge.failed':
        await handlePaymentFailure(event.data);
        break;
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      case 'transfer.failed':
        await handleTransferFailure(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSuccess(paymentData: any) {
  const { reference, amount, customer } = paymentData;
  
  try {
    // Update transaction status
    const [transaction] = await db
      .update(transactions)
      .set({ 
        status: 'COMPLETED',
        paystackReference: reference,
        completedAt: new Date()
      })
      .where(eq(transactions.reference, reference))
      .returning();

    if (!transaction) {
      console.error('Transaction not found:', reference);
      return;
    }

    // Handle different transaction types
    switch (transaction.type) {
      case 'WALLET_FUNDING':
        await handleWalletFunding(transaction);
        break;
      case 'ORDER_PAYMENT':
        await handleOrderPayment(transaction);
        break;
      case 'TOLL_PAYMENT':
        await handleTollPayment(transaction);
        break;
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handleWalletFunding(transaction: any) {
  // Update wallet balance
  await db
    .update(wallets)
    .set({ 
      balance: sql`balance + ${transaction.amount}`,
      updatedAt: new Date()
    })
    .where(eq(wallets.userId, transaction.userId));

  console.log(`Wallet funded: User ${transaction.userId}, Amount: ${transaction.amount}`);
}

async function handleOrderPayment(transaction: any) {
  // Update order status and create escrow entry
  const [order] = await db
    .update(orders)
    .set({ 
      status: 'PAID',
      updatedAt: new Date()
    })
    .where(eq(orders.id, transaction.orderId))
    .returning();

  if (order) {
    // Create escrow transaction
    await db.insert(escrowTransactions).values({
      orderId: order.id,
      amount: transaction.amount,
      status: 'HELD',
      merchantId: order.merchantId,
      customerId: order.customerId,
      driverId: order.driverId,
      createdAt: new Date()
    });

    // Broadcast order update
    await broadcastOrderUpdate(order.id, 'PAID');
    console.log(`Order payment processed: Order ${order.id}, Escrow created`);
  }
}

async function handleTollPayment(transaction: any) {
  console.log(`Toll payment processed: ${transaction.reference}`);
}

async function handlePaymentFailure(paymentData: any) {
  const { reference } = paymentData;
  
  await db
    .update(transactions)
    .set({ 
      status: 'FAILED',
      updatedAt: new Date()
    })
    .where(eq(transactions.reference, reference));

  console.log(`Payment failed: ${reference}`);
}

async function handleTransferSuccess(transferData: any) {
  const { reference } = transferData;
  
  await db
    .update(transactions)
    .set({ 
      status: 'COMPLETED',
      completedAt: new Date()
    })
    .where(eq(transactions.paystackReference, reference));

  console.log(`Transfer successful: ${reference}`);
}

async function handleTransferFailure(transferData: any) {
  const { reference } = transferData;
  
  await db
    .update(transactions)
    .set({ 
      status: 'FAILED',
      updatedAt: new Date()
    })
    .where(eq(transactions.paystackReference, reference));

  console.log(`Transfer failed: ${reference}`);
}

export default router;
