import Paystack from 'paystack';
import crypto from 'crypto';

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  callbackUrl: string;
}

class PaystackService {
  private paystack: any;
  private config: PaystackConfig;

  constructor() {
    this.config = {
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL || `${process.env.BASE_URL}/api/payments/paystack/callback`
    };

    if (!this.config.secretKey) {
      console.warn('⚠️  Paystack secret key not configured - payment processing will fail');
      console.log('Please set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY environment variables');
      // Don't return - allow initialization to complete but warn about missing keys
    }

    if (this.config.secretKey) {
      this.paystack = Paystack(this.config.secretKey);
    }
  }

  // Initialize transaction
  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo
    reference?: string;
    callback_url?: string;
    metadata?: any;
    channels?: string[];
    split_code?: string;
    subaccount?: string;
    transaction_charge?: number;
    bearer?: 'account' | 'subaccount';
  }) {
    if (!this.paystack) {
      throw new Error('Paystack not initialized - check your secret key configuration');
    }

    try {
      const response = await this.paystack.transaction.initialize({
        email: params.email,
        amount: Math.round(params.amount), // Ensure integer
        reference: params.reference,
        callback_url: params.callback_url || this.config.callbackUrl,
        metadata: params.metadata,
        channels: params.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        split_code: params.split_code,
        subaccount: params.subaccount,
        transaction_charge: params.transaction_charge,
        bearer: params.bearer || 'account'
      });

      return {
        success: true,
        data: response.data,
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code,
        reference: response.data.reference
      };
    } catch (error: any) {
      console.error('Paystack initialization error:', error);
      return {
        success: false,
        error: error.message || 'Transaction initialization failed',
        details: error
      };
    }
  }

  // Verify transaction
  async verifyTransaction(reference: string) {
    try {
      const response = await this.paystack.transaction.verify(reference);

      return {
        success: true,
        data: response.data,
        status: response.data.status,
        amount: response.data.amount,
        customer: response.data.customer,
        authorization: response.data.authorization,
        metadata: response.data.metadata
      };
    } catch (error: any) {
      console.error('Paystack verification error:', error);
      return {
        success: false,
        error: error.message || 'Transaction verification failed',
        details: error
      };
    }
  }

  // Create customer
  async createCustomer(params: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: any;
  }) {
    try {
      const response = await this.paystack.customer.create(params);

      return {
        success: true,
        data: response.data,
        customer_code: response.data.customer_code,
        id: response.data.id
      };
    } catch (error: any) {
      console.error('Paystack customer creation error:', error);
      return {
        success: false,
        error: error.message || 'Customer creation failed',
        details: error
      };
    }
  }

  // Charge authorization (for saved cards)
  async chargeAuthorization(params: {
    authorization_code: string;
    email: string;
    amount: number;
    reference?: string;
    metadata?: any;
  }) {
    try {
      const response = await this.paystack.transaction.chargeAuthorization({
        authorization_code: params.authorization_code,
        email: params.email,
        amount: Math.round(params.amount),
        reference: params.reference,
        metadata: params.metadata
      });

      return {
        success: true,
        data: response.data,
        status: response.data.status,
        reference: response.data.reference
      };
    } catch (error: any) {
      console.error('Paystack charge authorization error:', error);
      return {
        success: false,
        error: error.message || 'Authorization charge failed',
        details: error
      };
    }
  }

  // Create transfer recipient
  async createTransferRecipient(params: {
    type: 'nuban' | 'mobile_money' | 'basa';
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
    description?: string;
    metadata?: any;
  }) {
    try {
      const response = await this.paystack.transferrecipient.create({
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || 'NGN',
        description: params.description,
        metadata: params.metadata
      });

      return {
        success: true,
        data: response.data,
        recipient_code: response.data.recipient_code
      };
    } catch (error: any) {
      console.error('Paystack transfer recipient creation error:', error);
      return {
        success: false,
        error: error.message || 'Transfer recipient creation failed',
        details: error
      };
    }
  }

  // Initiate transfer
  async initiateTransfer(params: {
    source: 'balance';
    amount: number;
    recipient: string;
    reason?: string;
    currency?: string;
    reference?: string;
  }) {
    try {
      const response = await this.paystack.transfer.create({
        source: params.source,
        amount: Math.round(params.amount),
        recipient: params.recipient,
        reason: params.reason || 'Payment transfer',
        currency: params.currency || 'NGN',
        reference: params.reference
      });

      return {
        success: true,
        data: response.data,
        transfer_code: response.data.transfer_code,
        reference: response.data.reference
      };
    } catch (error: any) {
      console.error('Paystack transfer initiation error:', error);
      return {
        success: false,
        error: error.message || 'Transfer initiation failed',
        details: error
      };
    }
  }

  // Verify transfer
  async verifyTransfer(reference: string) {
    try {
      const response = await this.paystack.transfer.verify(reference);

      return {
        success: true,
        data: response.data,
        status: response.data.status,
        amount: response.data.amount
      };
    } catch (error: any) {
      console.error('Paystack transfer verification error:', error);
      return {
        success: false,
        error: error.message || 'Transfer verification failed',
        details: error
      };
    }
  }

  // Get banks
  async getBanks(country: string = 'nigeria') {
    try {
      const response = await this.paystack.misc.list_banks({ country });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Paystack get banks error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch banks',
        details: error
      };
    }
  }

  // Resolve account number
  async resolveAccountNumber(account_number: string, bank_code: string) {
    try {
      const response = await this.paystack.misc.resolve_account_number({
        account_number,
        bank_code
      });

      return {
        success: true,
        data: response.data,
        account_name: response.data.account_name,
        account_number: response.data.account_number
      };
    } catch (error: any) {
      console.error('Paystack account resolution error:', error);
      return {
        success: false,
        error: error.message || 'Account resolution failed',
        details: error
      };
    }
  }

  // Refund transaction
  async refundTransaction(params: {
    transaction: string; // transaction reference or id
    amount?: number; // optional partial refund amount
    currency?: string;
    customer_note?: string;
    merchant_note?: string;
  }) {
    try {
      const response = await this.paystack.refund.create({
        transaction: params.transaction,
        amount: params.amount ? Math.round(params.amount) : undefined,
        currency: params.currency || 'NGN',
        customer_note: params.customer_note,
        merchant_note: params.merchant_note
      });

      return {
        success: true,
        data: response.data,
        refund_reference: response.data.reference
      };
    } catch (error: any) {
      console.error('Paystack refund error:', error);
      return {
        success: false,
        error: error.message || 'Refund failed',
        details: error
      };
    }
  }

  // Create split payment
  async createSplit(params: {
    name: string;
    type: 'percentage' | 'flat';
    currency: string;
    subaccounts: Array<{
      subaccount: string;
      share: number;
    }>;
    bearer_type: 'all' | 'account' | 'subaccount';
    bearer_subaccount?: string;
  }) {
    try {
      const response = await this.paystack.split.create(params);

      return {
        success: true,
        data: response.data,
        split_code: response.data.split_code
      };
    } catch (error: any) {
      console.error('Paystack split creation error:', error);
      return {
        success: false,
        error: error.message || 'Split creation failed',
        details: error
      };
    }
  }

  // Validate webhook
  validateWebhook(signature: string, body: string): boolean {
    const hash = crypto.createHmac('sha512', this.config.secretKey).update(JSON.stringify(body)).digest('hex');
    return hash === signature;
  }

  // Get configuration
  getConfig() {
    return {
      publicKey: this.config.publicKey,
      callbackUrl: this.config.callbackUrl
    };
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!this.config.secretKey && !!this.config.publicKey;
  }
}

export const paystackService = new PaystackService();

interface PaymentData {
  email: string;
  amount: number;
  reference: string;
  metadata?: any;
}

export const paystack = {
  async initializePayment(data: PaymentData) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return response.json();
  },

  async verifyPayment(reference: string) {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    return response.json();
  },

  async verifyAccount(accountNumber: string, bankCode: string) {
    const response = await fetch('https://api.paystack.co/bank/resolve', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode
      })
    });

    return response.json();
  },

  async getBanks() {
    const response = await fetch('https://api.paystack.co/bank', {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    return response.json();
  },

  async createTransferRecipient(data: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
  }) {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return response.json();
  },

  async initiateTransfer(data: {
    amount: number;
    recipient: string;
    bankCode: string;
    reference: string;
    reason?: string;
  }) {
    // First create recipient
    const recipientData = await this.createTransferRecipient({
      type: 'nuban',
      name: 'Recipient',
      account_number: data.recipient,
      bank_code: data.bankCode
    });

    if (!recipientData.status) {
      throw new Error('Failed to create transfer recipient');
    }

    // Then initiate transfer
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: data.amount,
        recipient: recipientData.data.recipient_code,
        reference: data.reference,
        reason: data.reason
      })
    });

    return response.json();
  },

  async verifyTransfer(transferCode: string) {
    const response = await fetch(`https://api.paystack.co/transfer/${transferCode}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    return response.json();
  }
};