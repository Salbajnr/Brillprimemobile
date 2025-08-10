// Storage implementation with real database integration
import { db } from './db';
import { 
  users, 
  orders, 
  transactions, 
  driverProfiles, 
  products,
  fuelOrders
} from '../shared/schema';
import { eq, desc, and, gte, sql, isNull, lte, count, sum } from 'drizzle-orm';

export const storage = {
  // User management
  async getUser(userId: number) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async createUser(userData: any) {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Order tracking methods
  async getOrderTracking(orderId: string) {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
      return order ? {
        buyerId: order.customerId,
        sellerId: order.merchantId,
        driverId: order.driverId
      } : null;
    } catch (error) {
      console.error('Error getting order tracking:', error);
      return null;
    }
  },

  // Driver dashboard data with real database queries
  async getDriverDashboardData(driverId: number) {
    try {
      // Get today's deliveries and earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [todayStats] = await db.select({
        deliveries: count(orders.id),
        earnings: sum(transactions.amount)
      }).from(orders)
        .leftJoin(transactions, eq(orders.id, transactions.orderId))
        .where(and(
          eq(orders.driverId, driverId),
          gte(orders.createdAt, today),
          eq(orders.status, 'DELIVERED')
        ));

      // Get total stats
      const [totalStats] = await db.select({
        totalDeliveries: count(orders.id),
        totalEarnings: sum(transactions.amount),
        completionRate: sql<number>`(count(case when status = 'DELIVERED' then 1 end) * 100.0 / count(*))`
      }).from(orders)
        .leftJoin(transactions, eq(orders.id, transactions.orderId))
        .where(eq(orders.driverId, driverId));

      // Get active fuel orders
      const activeFuelOrders = await db.select()
        .from(fuelOrders)
        .where(and(
          eq(fuelOrders.driverId, driverId),
          isNull(fuelOrders.deliveredAt)
        ))
        .orderBy(desc(fuelOrders.createdAt))
        .limit(5);

      return {
        todayDeliveries: todayStats.deliveries || 0,
        todayEarnings: parseFloat(todayStats.earnings?.toString() || '0'),
        totalDeliveries: totalStats.totalDeliveries || 0,
        totalEarnings: parseFloat(totalStats.totalEarnings?.toString() || '0'),
        completionRate: parseFloat(totalStats.completionRate?.toString() || '0'),
        activeFuelOrders: activeFuelOrders.map(order => ({
          id: order.id,
          fuelType: order.fuelType,
          quantity: parseFloat(order.quantity),
          totalAmount: parseFloat(order.totalAmount),
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          scheduledTime: order.scheduledDeliveryTime
        }))
      };
    } catch (error) {
      console.error('Error getting driver dashboard data:', error);
      return {
        todayDeliveries: 0,
        todayEarnings: 0,
        totalDeliveries: 0,
        totalEarnings: 0,
        completionRate: 0,
        activeFuelOrders: []
      };
    }
  },

  // Merchant dashboard data with real database queries
  async getMerchantDashboardData(merchantId: number) {
    try {
      // Get today's orders and revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [todayStats] = await db.select({
        orders: count(orders.id),
        revenue: sum(orders.totalAmount)
      }).from(orders)
        .where(and(
          eq(orders.merchantId, merchantId),
          gte(orders.createdAt, today)
        ));

      // Get total stats
      const [totalStats] = await db.select({
        totalOrders: count(orders.id),
        totalRevenue: sum(orders.totalAmount)
      }).from(orders)
        .where(eq(orders.merchantId, merchantId));

      // Get product inventory
      const productStats = await db.select({
        totalProducts: count(products.id),
        activeProducts: sql<number>`count(case when is_active = true then 1 end)`,
        lowStockProducts: sql<number>`count(case when stock_level <= low_stock_threshold then 1 end)`
      }).from(products)
        .where(eq(products.sellerId, merchantId));

      // Get recent orders
      const recentOrders = await db.select()
        .from(orders)
        .where(eq(orders.merchantId, merchantId))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      return {
        todayOrders: todayStats.orders || 0,
        todayRevenue: parseFloat(todayStats.revenue?.toString() || '0'),
        totalOrders: totalStats.totalOrders || 0,
        totalRevenue: parseFloat(totalStats.totalRevenue?.toString() || '0'),
        productStats: productStats[0] || { totalProducts: 0, activeProducts: 0, lowStockProducts: 0 },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          totalAmount: parseFloat(order.totalAmount),
          status: order.status,
          createdAt: order.createdAt
        }))
      };
    } catch (error) {
      console.error('Error getting merchant dashboard data:', error);
      return {
        todayOrders: 0,
        todayRevenue: 0,
        totalOrders: 0,
        totalRevenue: 0,
        productStats: { totalProducts: 0, activeProducts: 0, lowStockProducts: 0 },
        recentOrders: []
      };
    }
  },

  // Consumer wallet and transaction data
  async getConsumerDashboardData(consumerId: number) {
    try {
      // Get recent transactions
      const recentTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, consumerId))
        .orderBy(desc(transactions.createdAt))
        .limit(10);

      // Get transaction summary
      const [transactionSummary] = await db.select({
        totalTransactions: count(transactions.id),
        totalSpent: sum(transactions.amount),
        successfulTransactions: sql<number>`count(case when payment_status = 'COMPLETED' then 1 end)`
      }).from(transactions)
        .where(eq(transactions.userId, consumerId));

      // Get recent orders
      const recentOrders = await db.select()
        .from(orders)
        .where(eq(orders.customerId, consumerId))
        .orderBy(desc(orders.createdAt))
        .limit(5);

      // Get wallet balance
      const [walletData] = await db.select({
        balance: wallets.balance
      }).from(wallets)
        .where(eq(wallets.userId, consumerId))
        .limit(1);

      return {
        balance: parseFloat(walletData?.balance || '0'),
        totalTransactions: transactionSummary.totalTransactions || 0,
        totalSpent: parseFloat(transactionSummary.totalSpent?.toString() || '0'),
        successRate: transactionSummary.totalTransactions > 0 
          ? (transactionSummary.successfulTransactions / transactionSummary.totalTransactions) * 100 
          : 0,
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          paymentMethod: tx.paymentMethod,
          status: tx.paymentStatus,
          createdAt: tx.createdAt,
          description: `Transaction ${tx.transactionRef}`
        })),
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: parseFloat(order.totalAmount),
          status: order.status,
          orderType: order.orderType,
          createdAt: order.createdAt
        }))
      };
    } catch (error) {
      console.error('Error getting consumer dashboard data:', error);
      return {
        balance: 0,
        totalTransactions: 0,
        totalSpent: 0,
        successRate: 0,
        recentTransactions: [],
        recentOrders: []
      };
    }
  },

  // Transaction metrics for admin dashboard
  async getTransactionMetrics(timeframe: string) {
    try {
      const hoursAgo = timeframe === '1h' ? 1 : 24;
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const [result] = await db.select({
        totalTransactions: count(transactions.id),
        totalVolume: sum(transactions.amount),
        successfulTransactions: sql<number>`count(case when payment_status = 'COMPLETED' then 1 end)`
      }).from(transactions).where(gte(transactions.createdAt, since));

      return {
        totalTransactions: result.totalTransactions || 0,
        totalVolume: parseFloat(result.totalVolume?.toString() || '0'),
        successRate: result.totalTransactions > 0 
          ? (result.successfulTransactions / result.totalTransactions) * 100 
          : 0
      };
    } catch (error) {
      console.error('Error getting transaction metrics:', error);
      return {
        totalTransactions: 0,
        totalVolume: 0,
        successRate: 0
      };
    }
  },

  // Driver location methods
  async updateDriverLocation(driverId: number, latitude: number, longitude: number) {
    try {
      await db.update(driverProfiles)
        .set({ 
          currentLatitude: latitude.toString(),
          currentLongitude: longitude.toString(),
          lastLocationUpdate: new Date()
        })
        .where(eq(driverProfiles.userId, driverId));
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  },

  // Get products for merchant
  async getProducts(merchantId: number) {
    try {
      const merchantProducts = await db.select()
        .from(products)
        .where(eq(products.sellerId, merchantId))
        .orderBy(desc(products.createdAt));

      return merchantProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        unit: product.unit,
        category: product.categoryName,
        inStock: product.inStock,
        stockLevel: product.stockLevel,
        rating: parseFloat(product.rating || '0'),
        reviewCount: product.reviewCount,
        totalSold: product.totalSold,
        isActive: product.isActive,
        createdAt: product.createdAt
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  },

  // Real-time support ticket management
  async createSupportTicket(ticketData: any) {
    try {
      const [ticket] = await db.insert(supportTickets).values(ticketData).returning();
      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  },

  async getSupportTickets(filters: any = {}) {
    try {
      let query = db.select().from(supportTickets);
      
      if (filters.status) {
        query = query.where(eq(supportTickets.status, filters.status));
      }
      
      if (filters.priority) {
        query = query.where(eq(supportTickets.priority, filters.priority));
      }

      if (filters.assignedTo) {
        query = query.where(eq(supportTickets.assignedTo, filters.assignedTo));
      }

      const tickets = await query.orderBy(desc(supportTickets.createdAt));
      return tickets;
    } catch (error) {
      console.error('Error getting support tickets:', error);
      return [];
    }
  },

  async updateSupportTicket(ticketId: number, updates: any) {
    try {
      const [ticket] = await db.update(supportTickets)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(supportTickets.id, ticketId))
        .returning();
      return ticket;
    } catch (error) {
      console.error('Error updating support ticket:', error);
      throw error;
    }
  },

  // Real-time notification system
  async getNotifications(userId: number, limit: number = 10) {
    try {
      const userNotifications = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      return userNotifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  },

  async createNotification(notificationData: any) {
    try {
      const [notification] = await db.insert(notifications).values(notificationData).returning();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
};