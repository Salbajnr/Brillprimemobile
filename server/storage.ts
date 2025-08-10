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
import { users, orders, wallets, transactions, drivers, merchants, notifications, conversations, messages, driverProfiles, walletBalance } from '../shared/schema';
import { eq, desc, and, gte, sql, isNull, lte } from 'drizzle-orm';

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
  },

  // Driver-specific methods
  async getDriverProfile(userId: number) {
    try {
      const profile = await this.db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, userId))
        .limit(1);

      return profile[0] || null;
    } catch (error) {
      console.error('Error getting driver profile:', error);
      throw error;
    }
  },

  async getDriverDeliveriesForDate(driverId: number, date: Date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const deliveries = await this.db
        .select()
        .from(orders)
        .where(and(
          eq(orders.driverId, driverId),
          gte(orders.createdAt, startOfDay),
          lte(orders.createdAt, endOfDay),
          eq(orders.status, 'delivered')
        ));

      return deliveries.map(delivery => ({
        ...delivery,
        deliveryFee: parseFloat(delivery.totalAmount) * 0.15, // 15% delivery fee
        onTime: Math.random() > 0.2 // Mock on-time calculation, 80% on-time rate
      }));
    } catch (error) {
      console.error('Error getting driver deliveries for date:', error);
      throw error;
    }
  },

  async getDriverDeliveriesForPeriod(driverId: number, startDate: Date, endDate: Date) {
    try {
      const deliveries = await this.db
        .select()
        .from(orders)
        .where(and(
          eq(orders.driverId, driverId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        ));

      return deliveries.map(delivery => ({
        ...delivery,
        deliveryFee: parseFloat(delivery.totalAmount) * 0.15, // 15% delivery fee
        onTime: Math.random() > 0.2 // Mock on-time calculation, 80% on-time rate
      }));
    } catch (error) {
      console.error('Error getting driver deliveries for period:', error);
      throw error;
    }
  },

  async getDriverDeliveries(driverId: number) {
    try {
      const deliveries = await this.db
        .select()
        .from(orders)
        .where(eq(orders.driverId, driverId))
        .orderBy(desc(orders.createdAt));

      return deliveries.map(delivery => ({
        ...delivery,
        deliveryFee: parseFloat(delivery.totalAmount) * 0.15, // 15% delivery fee
        onTime: Math.random() > 0.2 // Mock on-time calculation
      }));
    } catch (error) {
      console.error('Error getting driver deliveries:', error);
      throw error;
    }
  },

  async getAvailableDeliveryRequests(driverId: number) {
    try {
      // Get pending orders that don't have a driver assigned
      const availableOrders = await this.db
        .select({
          id: orders.id,
          customerId: orders.userId,
          orderId: orders.id,
          pickupAddress: orders.merchantAddress,
          deliveryAddress: orders.deliveryAddress,
          orderValue: orders.totalAmount,
          createdAt: orders.createdAt,
          paymentMethod: orders.paymentMethod,
          specialInstructions: orders.notes
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(and(
          eq(orders.status, 'pending'),
          isNull(orders.driverId)
        ))
        .orderBy(orders.createdAt)
        .limit(10);

      // Transform to delivery request format
      return availableOrders.map(order => ({
        id: order.id.toString(),
        orderId: order.orderId.toString(),
        deliveryType: Math.random() > 0.7 ? 'FUEL' : Math.random() > 0.5 ? 'FOOD' : 'PACKAGE',
        pickupAddress: order.pickupAddress || 'Pickup Location',
        deliveryAddress: order.deliveryAddress || 'Delivery Location', 
        pickupCoords: { lat: 6.5244 + (Math.random() - 0.5) * 0.1, lng: 3.3792 + (Math.random() - 0.5) * 0.1 },
        deliveryCoords: { lat: 6.5244 + (Math.random() - 0.5) * 0.1, lng: 3.3792 + (Math.random() - 0.5) * 0.1 },
        customerName: 'Customer', // Would get from user join
        customerPhone: '+234801234567',
        merchantName: 'Merchant',
        deliveryFee: parseFloat(order.orderValue) * 0.15,
        distance: 2 + Math.random() * 8, // 2-10 km
        estimatedTime: 20 + Math.random() * 40, // 20-60 minutes
        orderValue: parseFloat(order.orderValue),
        paymentMethod: order.paymentMethod || 'card',
        specialInstructions: order.specialInstructions,
        urgentDelivery: Math.random() > 0.8,
        temperatureSensitive: Math.random() > 0.9,
        fragile: Math.random() > 0.85,
        requiresVerification: Math.random() > 0.7,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to accept
        createdAt: order.createdAt
      }));
    } catch (error) {
      console.error('Error getting available delivery requests:', error);
      throw error;
    }
  },

  async updateDriverStatus(driverId: number, isOnline: boolean, location?: { lat: number; lng: number }) {
    try {
      const updates: any = { isOnline };
      if (location) {
        updates.currentLocation = location;
      }

      await this.db
        .update(driverProfiles)
        .set(updates)
        .where(eq(driverProfiles.userId, driverId));

      return { success: true };
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  },

  async updateDriverAvailability(driverId: number, isAvailable: boolean) {
    try {
      await this.db
        .update(driverProfiles)
        .set({ isAvailable })
        .where(eq(driverProfiles.userId, driverId));

      return { success: true };
    } catch (error) {
      console.error('Error updating driver availability:', error);
      throw error;
    }
  },

  async acceptDeliveryRequest(requestId: string, driverId: number) {
    try {
      // Update order with driver assignment
      const [updatedOrder] = await this.db
        .update(orders)
        .set({ 
          driverId,
          status: 'confirmed', // Or 'assigned'
          updatedAt: new Date()
        })
        .where(eq(orders.id, parseInt(requestId)))
        .returning();

      if (!updatedOrder) {
        throw new Error('Order not found or already assigned');
      }

      // Get customer information
      const customerInfo = await this.db
        .select()
        .from(users)
        .where(eq(users.id, updatedOrder.userId))
        .limit(1);

      return {
        id: updatedOrder.id.toString(),
        orderId: updatedOrder.id.toString(),
        customerId: updatedOrder.userId,
        merchantId: updatedOrder.merchantId,
        customerName: customerInfo[0]?.fullName || 'Customer',
        customerPhone: customerInfo[0]?.phone || '+234801234567',
        pickupAddress: updatedOrder.merchantAddress || 'Pickup Location',
        deliveryAddress: updatedOrder.deliveryAddress || 'Delivery Location',
        deliveryFee: parseFloat(updatedOrder.totalAmount) * 0.15,
        estimatedTime: 30,
        orderItems: [], // Would parse from order details
        specialInstructions: updatedOrder.notes
      };
    } catch (error) {
      console.error('Error accepting delivery request:', error);
      throw error;
    }
  },

  async getDeliveryById(deliveryId: string) {
    try {
      const delivery = await this.db
        .select()
        .from(orders)
        .where(eq(orders.id, parseInt(deliveryId)))
        .limit(1);

      if (delivery.length === 0) {
        return null;
      }

      return {
        ...delivery[0],
        driverId: delivery[0].driverId,
        customerId: delivery[0].userId,
        merchantId: delivery[0].merchantId
      };
    } catch (error) {
      console.error('Error getting delivery by ID:', error);
      throw error;
    }
  },

  async updateDeliveryStatus(deliveryId: string, status: string, metadata?: any) {
    try {
      const updates: any = {
        status: status.toLowerCase(),
        updatedAt: new Date()
      };

      // Store proof and other metadata if provided
      if (metadata?.proof) {
        updates.notes = JSON.stringify({ 
          proof: metadata.proof,
          notes: metadata.notes,
          location: metadata.location
        });
      }

      const [updatedDelivery] = await this.db
        .update(orders)
        .set(updates)
        .where(eq(orders.id, parseInt(deliveryId)))
        .returning();

      return updatedDelivery;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  },

  async updateDriverEarnings(driverId: number, earnings: number) {
    try {
      // Get current earnings
      const driverProfile = await this.getDriverProfile(driverId);
      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      const newTotalEarnings = (driverProfile.totalEarnings || 0) + earnings;
      const newTotalDeliveries = (driverProfile.totalDeliveries || 0) + 1;

      await this.db
        .update(driverProfiles)
        .set({ 
          totalEarnings: newTotalEarnings,
          totalDeliveries: newTotalDeliveries
        })
        .where(eq(driverProfiles.userId, driverId));

      return { success: true };
    } catch (error) {
      console.error('Error updating driver earnings:', error);
      throw error;
    }
  }
};



  // Merchant analytics methods
  async getMerchantEscrowBalance(merchantId: string) {
    try {
      // Get from wallet or transactions table
      const balance = await this.db
        .select()
        .from(walletBalance)
        .where(eq(walletBalance.userId, parseInt(merchantId)))
        .limit(1);

      const pendingTransactions = await this.db
        .select()
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
};