// Storage implementation with real database integration
import { db } from './db';
import { 
  users, 
  orders, 
  transactions, 
  driverProfiles, 
  products,
  fuelOrders,
  wallets,
  supportTickets,
  notifications
} from '../shared/schema';
import { eq, desc, and, gte, sql, isNull, lte, count, sum } from 'drizzle-orm';

export const storage = {
  // Categories management
  async getCategories(filters: { includeInactive?: boolean; parentId?: number } = {}) {
    const conditions = [];
    
    if (!filters.includeInactive) {
      conditions.push(eq(categories.isActive, true));
    }
    
    if (filters.parentId) {
      conditions.push(eq(categories.parentId, filters.parentId));
    }

    return await db.select().from(categories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(categories.sortOrder, categories.name);
  },

  async getCategoryById(id: number) {
    const [category] = await db.select().from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category;
  },

  async createCategory(categoryData: any) {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  },

  async updateCategory(id: number, data: any) {
    const [category] = await db.update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  },

  async deleteCategory(id: number) {
    await db.delete(categories).where(eq(categories.id, id));
  },

  // Orders management
  async createOrder(orderData: any) {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  },

  async getOrderById(orderId: string) {
    const [order] = await db.select().from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);
    return order;
  },

  async getCustomerOrders(userId: number, filters: any) {
    const conditions = [eq(orders.customerId, userId)];
    
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    
    const ordersList = await db.select().from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return {
      orders: ordersList,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: ordersList.length
      }
    };
  },

  async getMerchantOrders(userId: number, filters: any) {
    const conditions = [eq(orders.merchantId, userId)];
    
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    
    const ordersList = await db.select().from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return {
      orders: ordersList,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: ordersList.length
      }
    };
  },

  async getDriverOrders(userId: number, filters: any = {}) {
    const conditions = [eq(orders.driverId, userId)];
    
    if (filters.status && typeof filters === 'string') {
      conditions.push(eq(orders.status, filters));
    } else if (filters.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    
    const ordersList = await db.select().from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit || 50)
      .offset(((filters.page || 1) - 1) * (filters.limit || 50));

    return filters.status && typeof filters === 'string' ? ordersList : {
      orders: ordersList,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 50,
        total: ordersList.length
      }
    };
  },

  async updateOrderStatus(orderId: string, statusData: any) {
    const [order] = await db.update(orders)
      .set({
        status: statusData.status,
        notes: statusData.notes,
        updatedAt: new Date()
      })
      .where(eq(orders.id, parseInt(orderId)))
      .returning();
    return order;
  },

  async getOrderTransactions(orderId: string) {
    return await db.select().from(transactions)
      .where(eq(transactions.orderId, parseInt(orderId)))
      .orderBy(desc(transactions.createdAt));
  },

  async getOrderTracking(orderId: string) {
    // Mock tracking data - implement based on your tracking system
    return {
      orderId,
      status: 'IN_TRANSIT',
      location: { latitude: 6.5244, longitude: 3.3792 },
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
      updates: []
    };
  },

  async assignDriverToOrder(orderId: string, driverId: number) {
    await db.update(orders)
      .set({
        driverId,
        status: 'ASSIGNED',
        updatedAt: new Date()
      })
      .where(eq(orders.id, parseInt(orderId)));
  },

  async cancelOrder(orderId: string, cancelData: any) {
    await db.update(orders)
      .set({
        status: 'CANCELLED',
        notes: cancelData.reason,
        updatedAt: new Date()
      })
      .where(eq(orders.id, parseInt(orderId)));
  },

  async getDriverActiveOrders(userId: number) {
    return await db.select().from(orders)
      .where(and(
        eq(orders.driverId, userId),
        inArray(orders.status, ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'])
      ))
      .orderBy(desc(orders.createdAt));
  },

  async getMerchantActiveOrders(userId: number) {
    return await db.select().from(orders)
      .where(and(
        eq(orders.merchantId, userId),
        inArray(orders.status, ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'])
      ))
      .orderBy(desc(orders.createdAt));
  },

  async getCustomerActiveOrders(userId: number) {
    return await db.select().from(orders)
      .where(and(
        eq(orders.customerId, userId),
        inArray(orders.status, ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'])
      ))
      .orderBy(desc(orders.createdAt));
  },

  // Driver-specific methods
  async getDriverDeliveryAnalytics(driverId: number, period: string) {
    // Mock analytics - implement based on your analytics system
    return {
      totalDeliveries: 45,
      completedDeliveries: 42,
      successRate: 93.3,
      averageDeliveryTime: 28,
      earnings: 15750,
      ratings: 4.7
    };
  },

  async getDriverRatings(driverId: number, limit: number) {
    // Mock ratings - implement based on your ratings system
    return [
      { orderId: '123', rating: 5, comment: 'Excellent service', date: new Date() },
      { orderId: '124', rating: 4, comment: 'Good delivery', date: new Date() }
    ];
  },

  async updateDriverVehicle(driverId: number, vehicleData: any) {
    const [profile] = await db.update(driverProfiles)
      .set({
        vehicleType: vehicleData.vehicleType,
        vehiclePlate: vehicleData.vehiclePlate,
        vehicleModel: vehicleData.vehicleModel,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, driverId))
      .returning();
    return profile;
  },

  async getNearbyDeliveryOpportunities(driverId: number, location: any, radius: number) {
    // Mock opportunities - implement based on your location system
    return [
      {
        orderId: '125',
        pickupLocation: { lat: 6.5244, lng: 3.3792 },
        deliveryLocation: { lat: 6.4281, lng: 3.4106 },
        estimatedEarnings: 850,
        distance: 5.2,
        urgency: 'normal'
      }
    ];
  },

  async createDriverFeedback(feedbackData: any) {
    // Mock feedback creation - implement based on your feedback system
    return { id: Date.now(), ...feedbackData };
  },

  async getDriverSchedule(driverId: number, date: string) {
    // Mock schedule - implement based on your scheduling system
    return {
      date,
      shifts: [
        { start: '09:00', end: '17:00', type: 'regular' }
      ],
      availability: true
    };
  },

  async updateDriverSchedule(driverId: number, scheduleData: any) {
    // Mock schedule update - implement based on your scheduling system
    return { id: driverId, ...scheduleData };
  },

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
      const result = await db.insert(users).values(userData).returning();
      return result[0];
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
          updatedAt: new Date()
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
  },

  // Admin User Management Methods
  async getAllUsers(filters: any = {}) {
    try {
      let query = db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        kycStatus: users.kycStatus,
        totalSpent: users.totalSpent,
        totalOrders: users.totalOrders
      }).from(users);

      // Apply filters
      let whereConditions = [];

      if (filters.role && filters.role !== 'all') {
        whereConditions.push(eq(users.role, filters.role));
      }

      if (filters.status) {
        if (filters.status === 'verified') {
          whereConditions.push(eq(users.isVerified, true));
        } else if (filters.status === 'unverified') {
          whereConditions.push(eq(users.isVerified, false));
        } else if (filters.status === 'active') {
          whereConditions.push(eq(users.isActive, true));
        } else if (filters.status === 'inactive') {
          whereConditions.push(eq(users.isActive, false));
        }
      }

      if (filters.search) {
        whereConditions.push(
          sql`${users.fullName} ILIKE ${'%' + filters.search + '%'} OR ${users.email} ILIKE ${'%' + filters.search + '%'}`
        );
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const usersData = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [totalCount] = await db.select({ count: count() })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      return {
        users: usersData,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  },

  async getUserById(userId: number) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  },

  async updateUserStatus(userId: number, isActive: boolean) {
    try {
      const [updatedUser] = await db.update(users)
        .set({ 
          isActive, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  async updateUserRole(userId: number, newRole: string) {
    try {
      const [updatedUser] = await db.update(users)
        .set({ 
          role: newRole as any, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  async verifyUser(userId: number) {
    try {
      const [updatedUser] = await db.update(users)
        .set({ 
          isVerified: true, 
          verifiedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  },

  async bulkUpdateUsers(userIds: number[], updates: any) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        const [updatedUser] = await db.update(users)
          .set({ 
            ...updates, 
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId))
          .returning();
        results.push(updatedUser);
      }
      
      return results;
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw error;
    }
  },

  async getUserStats() {
    try {
      const [stats] = await db.select({
        totalUsers: count(),
        verifiedUsers: sql<number>`count(case when is_verified = true then 1 end)`,
        activeUsers: sql<number>`count(case when is_active = true then 1 end)`,
        consumers: sql<number>`count(case when role = 'CONSUMER' then 1 end)`,
        merchants: sql<number>`count(case when role = 'MERCHANT' then 1 end)`,
        drivers: sql<number>`count(case when role = 'DRIVER' then 1 end)`,
        admins: sql<number>`count(case when role = 'ADMIN' then 1 end)`
      }).from(users);

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalUsers: 0,
        verifiedUsers: 0,
        activeUsers: 0,
        consumers: 0,
        merchants: 0,
        drivers: 0,
        admins: 0
      };
    }
  }
};