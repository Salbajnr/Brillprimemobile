// Add method signatures for the features you're implementing
  abstract getOrderTracking(orderId: string): Promise<any>;
  abstract updateOrderTracking(orderId: string, status: string, location?: any): Promise<any>;
  abstract getDriverProfile(driverId: number): Promise<any>;
  abstract updateDriverLocation(driverId: number, location: any): Promise<void>;
  abstract addLocationHistory(driverId: number, location: any): Promise<void>;
  abstract getDriverOrders(driverId: number, status?: string): Promise<any[]>;

  // Chat and messaging methods
  abstract createConversation(data: {
    id: string;
    customerId: number;
    vendorId: number;
    conversationType: string;
    status: string;
  }): Promise<any>;
  abstract sendMessage(data: {
    id: string;
    conversationId: string;
    senderId: number;
    content: string;
    messageType: any;
  }): Promise<any>;
  abstract getConversationMessages(conversationId: string, limit: number, offset?: number): Promise<any[]>;

  // Support ticket methods
  abstract createSupportTicket(data: {
    userEmail: string;
    userRole: string;
    subject: string;
    description: string;
    priority: string;
  }): Promise<any>;
import { db } from './db';
import { users, orders, wallets, transactions, drivers, merchants, notifications, conversations, messages } from '../shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export const storage = {
  // Order tracking methods
  async getOrderTracking(orderId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return order ? {
      buyerId: order.userId,
      sellerId: order.merchantId,
      driverId: order.driverId
    } : null;
  },

  // Driver location methods
  async updateDriverLocation(driverId: number, latitude: number, longitude: number) {
    await db.update(drivers)
      .set({ 
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        lastLocationUpdate: new Date()
      })
      .where(eq(drivers.id, driverId));
  },

  // Transaction metrics
  async getTransactionMetrics(timeframe: string) {
    const hoursAgo = timeframe === '1h' ? 1 : 24;
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const result = await db.select({
      totalTransactions: sql<number>`count(*)`,
      totalVolume: sql<number>`sum(amount)`,
      successfulTransactions: sql<number>`count(case when status = 'completed' then 1 end)`
    }).from(transactions).where(gte(transactions.createdAt, since));

    const metrics = result[0];
    return {
      totalTransactions: metrics.totalTransactions || 0,
      totalVolume: parseFloat(metrics.totalVolume?.toString() || '0'),
      successRate: metrics.totalTransactions > 0 
        ? (metrics.successfulTransactions / metrics.totalTransactions) * 100 
        : 0
    };
  },

  // System metrics
  async getSystemMetrics() {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [completedOrders] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(orders).where(eq(orders.status, 'completed'));
    
    const [revenue] = await db.select({
      total: sql<number>`sum(amount)`
    }).from(transactions).where(eq(transactions.status, 'completed'));

    const [onlineDriversCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(drivers).where(eq(drivers.status, 'active'));

    return {
      totalUsers: userCount.count || 0,
      totalOrders: orderCount.count || 0,
      completedOrders: completedOrders.count || 0,
      totalRevenue: parseFloat(revenue.total?.toString() || '0'),
      onlineDrivers: onlineDriversCount.count || 0
    };
  },

  // User activity metrics
  async getUserActivityMetrics(timeframe: string) {
    const hoursAgo = timeframe === '1h' ? 1 : 24;
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const [newUsers] = await db.select({
      count: sql<number>`count(*)`
    }).from(users).where(gte(users.createdAt, since));

    return {
      newUsers: newUsers.count || 0,
      activeUsers: newUsers.count || 0 // Simplified for now
    };
  },

  // Wallet methods
  async getUserWallet(userId: number) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    return wallet;
  },

  // Message methods
  async sendMessage(data: {
    conversationId: string;
    senderId: number;
    content: string;
    messageType: string;
  }) {
    const [message] = await db.insert(messages).values({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType as any,
      createdAt: new Date()
    }).returning();
    
    return message;
  },

  // Support methods (simplified)
  async addSupportMessage(data: {
    ticketId: string;
    senderId: number;
    content: string;
    attachments?: string[];
  }) {
    // This would be implemented with a proper support tickets table
    return {
      id: Math.random().toString(),
      ticketId: data.ticketId,
      senderId: data.senderId,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date()
    };
  }
};



  // Merchant analytics methods
  async getMerchantEscrowBalance(merchantId: string) {
    try {
      // Get from wallet or transactions table
      const balance = await db.select()
        .from(walletBalance)
        .where(eq(walletBalance.userId, parseInt(merchantId)))
        .limit(1);

      const pendingTransactions = await db.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, parseInt(merchantId)),
            eq(transactions.paymentStatus, 'PENDING')
          )
        );

      const pendingAmount = pendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        availableBalance: balance[0]?.balance ? parseFloat(balance[0].balance) : 0,
        pendingWithdrawals: pendingAmount
      };
    } catch (error) {
      console.error("Get merchant escrow balance error:", error);
      return { availableBalance: 0, pendingWithdrawals: 0 };
    }
  }

  async getTopSellingProducts(merchantId: string, limit: number = 5) {
    try {
      // This would need a proper orderItems table in a real implementation
      // For now, return mock data structure
      return [
        {
          productId: "1",
          productName: "Sample Product 1",
          revenue: 15000,
          unitsSold: 50
        },
        {
          productId: "2", 
          productName: "Sample Product 2",
          revenue: 12000,
          unitsSold: 40
        }
      ];
    } catch (error) {
      console.error("Get top selling products error:", error);
      return [];
    }
  }

  async getProductSalesStats(merchantId: string, startDate: Date, endDate: Date) {
    try {
      // Get product sales statistics for the period
      const products = await this.getMerchantProducts(merchantId);
      return products.map((product: any) => ({
        productId: product.id,
        productName: product.name,
        totalSold: Math.floor(Math.random() * 100), // Mock data
        revenue: Math.floor(Math.random() * 10000),
        averagePrice: parseFloat(product.price)
      }));
    } catch (error) {
      console.error("Get product sales stats error:", error);
      return [];
    }
  }

  async getDailySalesStats(merchantId: string, startDate: Date, endDate: Date) {
    try {
      const orders = await this.getMerchantOrdersForPeriod(merchantId, startDate, endDate);
      
      // Group by day
      const dailyStats: any = {};
      orders.forEach((order: any) => {
        const day = new Date(order.createdAt).toISOString().split('T')[0];
        if (!dailyStats[day]) {
          dailyStats[day] = { revenue: 0, orders: 0 };
        }
        dailyStats[day].revenue += parseFloat(order.totalPrice || 0);
        dailyStats[day].orders += 1;
      });

      return {
        revenue: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
          date,
          amount: stats.revenue
        })),
        orders: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
          date,
          count: stats.orders
        }))
      };
    } catch (error) {
      console.error("Get daily sales stats error:", error);
      return { revenue: [], orders: [] };
    }
  }

  async getPaymentMethodStats(merchantId: string, startDate: Date, endDate: Date) {
    try {
      const transactions = await db.select()
        .from(transactions)
        .innerJoin(orders, eq(transactions.orderId, orders.id))
        .where(
          and(
            eq(orders.sellerId, parseInt(merchantId)),
            gte(transactions.createdAt, startDate),
            lte(transactions.createdAt, endDate)
          )
        );

      const paymentStats: any = {};
      transactions.forEach((transaction: any) => {
        const method = transaction.transactions.paymentMethod || 'unknown';
        if (!paymentStats[method]) {
          paymentStats[method] = { count: 0, amount: 0 };
        }
        paymentStats[method].count += 1;
        paymentStats[method].amount += parseFloat(transaction.transactions.amount || 0);
      });

      return Object.entries(paymentStats).map(([method, stats]: [string, any]) => ({
        method,
        count: stats.count,
        amount: stats.amount,
        percentage: 0 // Calculate percentage
      }));
    } catch (error) {
      console.error("Get payment method stats error:", error);
      return [];
    }
  }

  async getCustomerStats(merchantId: string) {
    try {
      const customers = await this.getMerchantCustomers(merchantId);
      const orders = await this.getMerchantOrders(merchantId);

      const customerOrderCounts: any = {};
      let totalOrderValue = 0;

      orders.forEach((order: any) => {
        const customerId = order.buyerId;
        if (!customerOrderCounts[customerId]) {
          customerOrderCounts[customerId] = { orders: 0, value: 0 };
        }
        customerOrderCounts[customerId].orders += 1;
        customerOrderCounts[customerId].value += parseFloat(order.totalPrice || 0);
        totalOrderValue += parseFloat(order.totalPrice || 0);
      });

      const averageOrders = customers.length > 0 ? 
        Object.values(customerOrderCounts).reduce((sum: number, c: any) => sum + c.orders, 0) / customers.length : 0;
      
      const averageLifetimeValue = customers.length > 0 ? totalOrderValue / customers.length : 0;

      // Get top customers
      const topCustomers = Object.entries(customerOrderCounts)
        .map(([customerId, stats]: [string, any]) => ({
          customerId,
          orderCount: stats.orders,
          totalValue: stats.value
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      return {
        averageOrders,
        averageLifetimeValue,
        topCustomers,
        segments: {
          highValue: topCustomers.filter(c => c.totalValue > averageLifetimeValue * 2).length,
          regular: topCustomers.filter(c => c.totalValue >= averageLifetimeValue && c.totalValue <= averageLifetimeValue * 2).length,
          occasional: topCustomers.filter(c => c.totalValue < averageLifetimeValue).length
        }
      };
    } catch (error) {
      console.error("Get customer stats error:", error);
      return {
        averageOrders: 0,
        averageLifetimeValue: 0,
        topCustomers: [],
        segments: { highValue: 0, regular: 0, occasional: 0 }
      };
    }
  }

  async generateSalesReport(merchantId: string, startDate: Date, endDate: Date) {
    try {
      const orders = await this.getMerchantOrdersForPeriod(merchantId, startDate, endDate);
      
      const report = {
        summary: {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0),
          averageOrderValue: 0,
          period: { start: startDate, end: endDate }
        },
        orders: orders.map((order: any) => ({
          orderNumber: order.orderNumber || `ORD-${order.id}`,
          customerName: order.buyer?.fullName || 'Unknown',
          totalAmount: order.totalPrice,
          status: order.status,
          paymentMethod: order.paymentMethod || 'unknown',
          createdAt: order.createdAt,
          items: order.orderItems || []
        }))
      };

      report.summary.averageOrderValue = report.summary.totalOrders > 0 ? 
        report.summary.totalRevenue / report.summary.totalOrders : 0;

      return report;
    } catch (error) {
      console.error("Generate sales report error:", error);
      throw error;
    }
  }
