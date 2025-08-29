
import { db } from '../db';
import { users, orders, transactions, notifications } from '../db';
import { eq, gte, desc, count, sum, and, or } from 'drizzle-orm';
import { queryOptimizer } from './queryOptimizer';

interface DatabaseSyncConfig {
  syncInterval: number;
  batchSize: number;
  retryAttempts: number;
  enableRealTimeSync: boolean;
}

export class DatabaseIntegrationService {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastSyncTimestamps: Map<string, Date> = new Map();
  private config: DatabaseSyncConfig;

  constructor(config: DatabaseSyncConfig = {
    syncInterval: 5000, // 5 seconds
    batchSize: 100,
    retryAttempts: 3,
    enableRealTimeSync: true
  }) {
    this.config = config;
    // Auto-start disabled during migration to Replit
    // this.startContinuousSync();
  }

  // Start continuous data synchronization
  startContinuousSync() {
    console.log('🔄 Starting continuous database synchronization...');

    // Sync user data
    this.startSyncProcess('users', this.syncUserData.bind(this));
    
    // Sync order data
    this.startSyncProcess('orders', this.syncOrderData.bind(this));
    
    // Sync transaction data
    this.startSyncProcess('transactions', this.syncTransactionData.bind(this));
    
    // Sync notifications
    this.startSyncProcess('notifications', this.syncNotificationData.bind(this));
    
    // Sync analytics data
    this.startSyncProcess('analytics', this.syncAnalyticsData.bind(this));

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('✅ Continuous database sync initialized');
  }

  private startSyncProcess(processName: string, syncFunction: () => Promise<void>) {
    if (this.syncIntervals.has(processName)) {
      clearInterval(this.syncIntervals.get(processName)!);
    }

    const interval = setInterval(async () => {
      try {
        await queryOptimizer.monitorQuery(`sync_${processName}`, syncFunction);
        this.lastSyncTimestamps.set(processName, new Date());
      } catch (error) {
        console.error(`❌ ${processName} sync failed:`, error);
        this.handleSyncError(processName, error);
      }
    }, this.config.syncInterval);

    this.syncIntervals.set(processName, interval);
  }

  // Continuous user data synchronization
  private async syncUserData(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('users') || new Date(Date.now() - 60000);
    
    const newUsers = await db.select()
      .from(users)
      .where(gte(users.createdAt, lastSync))
      .orderBy(desc(users.createdAt))
      .limit(this.config.batchSize);

    if (newUsers.length > 0) {
      console.log(`📊 Synced ${newUsers.length} new/updated users`);
      
      // Broadcast user updates via WebSocket
      global.io?.emit('user_data_update', {
        type: 'USER_SYNC',
        count: newUsers.length,
        timestamp: new Date()
      });
    }

    // Cache active user metrics
    const activeUsersCount = await db.select({ count: count() })
      .from(users)
      .where(gte(users.updatedAt, new Date(Date.now() - 30 * 60 * 1000))); // Last 30 minutes

    this.cacheMetric('active_users', activeUsersCount[0].count);
  }

  // Continuous order data synchronization
  private async syncOrderData(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('orders') || new Date(Date.now() - 60000);
    
    const newOrders = await db.select()
      .from(orders)
      .where(gte(orders.updatedAt, lastSync))
      .orderBy(desc(orders.updatedAt))
      .limit(this.config.batchSize);

    if (newOrders.length > 0) {
      console.log(`📦 Synced ${newOrders.length} new/updated orders`);
      
      // Broadcast order updates
      for (const order of newOrders) {
        global.io?.to(`order_${order.id}`).emit('order_update', {
          orderId: order.id,
          status: order.status,
          updatedAt: order.updatedAt,
          type: 'REAL_TIME_SYNC'
        });
      }

      // Update order metrics
      const pendingOrders = await db.select({ count: count() })
        .from(orders)
        .where(eq(orders.status, 'PENDING'));

      this.cacheMetric('pending_orders', pendingOrders[0].count);
    }
  }

  // Continuous transaction data synchronization
  private async syncTransactionData(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('transactions') || new Date(Date.now() - 60000);
    
    const newTransactions = await db.select()
      .from(transactions)
      .where(gte(transactions.createdAt, lastSync))
      .orderBy(desc(transactions.createdAt))
      .limit(this.config.batchSize);

    if (newTransactions.length > 0) {
      console.log(`💰 Synced ${newTransactions.length} new transactions`);
      
      // Calculate real-time revenue
      const todayRevenue = await db.select({ 
        total: sum(transactions.amount) 
      }).from(transactions)
        .where(gte(transactions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      this.cacheMetric('daily_revenue', todayRevenue[0].total || 0);

      // Broadcast transaction updates
      global.io?.emit('transaction_data_update', {
        type: 'TRANSACTION_SYNC',
        count: newTransactions.length,
        revenue: todayRevenue[0].total,
        timestamp: new Date()
      });
    }
  }

  // Continuous notification synchronization
  private async syncNotificationData(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('notifications') || new Date(Date.now() - 60000);
    
    const newNotifications = await db.select()
      .from(notifications)
      .where(gte(notifications.createdAt, lastSync))
      .orderBy(desc(notifications.createdAt))
      .limit(this.config.batchSize);

    if (newNotifications.length > 0) {
      console.log(`🔔 Synced ${newNotifications.length} new notifications`);
      
      // Send real-time notifications to users
      for (const notification of newNotifications) {
        global.io?.to(`user_${notification.userId}`).emit('new_notification', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          createdAt: notification.createdAt
        });
      }
    }
  }

  // Analytics data synchronization
  private async syncAnalyticsData(): Promise<void> {
    try {
      // Sync key performance indicators
      const [totalUsers, totalOrders, totalRevenue] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(orders),
        db.select({ total: sum(transactions.amount) }).from(transactions)
          .where(eq(transactions.paymentStatus, 'COMPLETED'))
      ]);

      const analytics = {
        totalUsers: totalUsers[0].count,
        totalOrders: totalOrders[0].count,
        totalRevenue: totalRevenue[0].total || 0,
        timestamp: new Date()
      };

      // Cache analytics
      this.cacheMetric('analytics_overview', analytics);

      // Broadcast to admin dashboard
      global.io?.to('admin_monitoring').emit('analytics_update', analytics);

    } catch (error) {
      console.error('Analytics sync error:', error);
    }
  }

  // Health monitoring for database connection
  private startHealthMonitoring() {
    setInterval(async () => {
      try {
        const startTime = Date.now();
        await db.execute("SELECT 1");
        const responseTime = Date.now() - startTime;

        this.cacheMetric('db_response_time', responseTime);

        if (responseTime > 1000) {
          console.warn(`⚠️ Slow database response: ${responseTime}ms`);
          global.io?.to('admin_monitoring').emit('db_performance_warning', {
            responseTime,
            timestamp: new Date()
          });
        }

      } catch (error) {
        console.error('❌ Database health check failed:', error);
        global.io?.to('admin_monitoring').emit('db_connection_error', {
          error: error.message,
          timestamp: new Date()
        });
      }
    }, 10000); // Every 10 seconds
  }

  // Cache metrics for fast retrieval
  private metricsCache: Map<string, any> = new Map();

  private cacheMetric(key: string, value: any) {
    this.metricsCache.set(key, {
      value,
      timestamp: new Date(),
      ttl: 30000 // 30 seconds TTL
    });
  }

  public getCachedMetric(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
      return cached.value;
    }
    return null;
  }

  // Get real-time dashboard data
  public async getDashboardMetrics() {
    const cached = this.getCachedMetric('analytics_overview');
    if (cached) {
      return { success: true, data: cached, source: 'cache' };
    }

    // Fallback to fresh data
    await this.syncAnalyticsData();
    return { 
      success: true, 
      data: this.getCachedMetric('analytics_overview'),
      source: 'database'
    };
  }

  // Handle sync errors with retry logic
  private async handleSyncError(processName: string, error: any) {
    const retryKey = `${processName}_retry_count`;
    const currentRetries = this.getCachedMetric(retryKey) || 0;

    if (currentRetries < this.config.retryAttempts) {
      this.cacheMetric(retryKey, currentRetries + 1);
      console.log(`🔄 Retrying ${processName} sync (${currentRetries + 1}/${this.config.retryAttempts})`);
      
      // Exponential backoff
      setTimeout(() => {
        const methodName = `sync${processName.charAt(0).toUpperCase() + processName.slice(1)}Data`;
        if (typeof this[methodName as keyof this] === 'function') {
          this.startSyncProcess(processName, (this[methodName as keyof this] as any).bind(this));
        } else {
          console.error(`❌ Method ${methodName} not found for ${processName} sync retry`);
        }
      }, Math.pow(2, currentRetries) * 1000);
    } else {
      console.error(`❌ ${processName} sync failed after ${this.config.retryAttempts} attempts`);
      this.cacheMetric(retryKey, 0); // Reset retry count
    }
  }

  // Real-time data streaming for specific entities
  public async streamEntityData(entityType: string, entityId: string, socket: any) {
    let query;
    
    switch (entityType) {
      case 'order':
        query = db.select().from(orders).where(eq(orders.id, parseInt(entityId)));
        break;
      case 'user':
        query = db.select().from(users).where(eq(users.id, parseInt(entityId)));
        break;
      case 'transaction':
        query = db.select().from(transactions).where(eq(transactions.id, parseInt(entityId)));
        break;
      default:
        throw new Error('Invalid entity type');
    }

    const interval = setInterval(async () => {
      try {
        const data = await query;
        socket.emit(`${entityType}_data_stream`, {
          entityId,
          data: data[0],
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Stream error for ${entityType}:${entityId}`, error);
        clearInterval(interval);
      }
    }, 2000); // Every 2 seconds

    return interval;
  }

  // Stop all sync processes
  public stopSync() {
    console.log('🛑 Stopping database synchronization...');
    
    for (const [processName, interval] of this.syncIntervals) {
      clearInterval(interval);
      console.log(`✅ Stopped ${processName} sync`);
    }
    
    this.syncIntervals.clear();
    this.lastSyncTimestamps.clear();
    this.metricsCache.clear();
  }

  // Get sync status
  public getSyncStatus() {
    const status = {
      activeProcesses: Array.from(this.syncIntervals.keys()),
      lastSyncTimes: Object.fromEntries(this.lastSyncTimestamps),
      cachedMetrics: Array.from(this.metricsCache.keys()),
      config: this.config
    };

    return status;
  }
}

// Export singleton instance - temporarily disabled during migration
export const databaseIntegration = null; // new DatabaseIntegrationService();
