
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { db } from '../db';
import { users, orders, transactions, supportTickets } from '../../shared/schema';
import { count, gte, eq, and } from 'drizzle-orm';

interface MetricData {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
  metadata?: any;
}

interface SystemMetrics {
  activeUsers: number;
  activeConnections: number;
  onlineDrivers: number;
  activeOrders: number;
  transactionsPerMinute: number;
  responseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseConnections: number;
}

export class RealTimeAnalytics extends EventEmitter {
  private redis: Redis | null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private alertInterval: NodeJS.Timeout | null = null;
  private currentMetrics: SystemMetrics;
  private memoryStore = new Map<string, any>();

  constructor() {
    super();
    // Redis configuration for analytics
    const REDIS_URL = "redis://default:ob0XzfYSqIWm028JdW7JkBY8VWkhQp7A@redis-13241.c245.us-east-1-3.ec2.redns.redis-cloud.com:13241";
    
    if (process.env.REDIS_DISABLED) {
      this.redis = null;
      console.log('Analytics using memory store (Redis disabled)');
    } else {
      try {
        this.redis = new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        console.log('Analytics connected to Redis Cloud');
      } catch (error) {
        this.redis = null;
        console.log('Analytics using memory store (Redis connection failed)');
      }
    }
    this.currentMetrics = this.getEmptyMetrics();
    this.startMetricsCollection();
    this.startAlertMonitoring();
  }

  private getEmptyMetrics(): SystemMetrics {
    return {
      activeUsers: 0,
      activeConnections: 0,
      onlineDrivers: 0,
      activeOrders: 0,
      transactionsPerMinute: 0,
      responseTime: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      databaseConnections: 0
    };
  }

  // Start collecting real-time metrics
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        // Temporarily disabled to prevent database errors during migration
        // await this.collectMetrics();
        // await this.broadcastMetrics();
        console.log('Metrics collection temporarily disabled');
      } catch (error) {
        console.error('Metrics collection error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  // Start monitoring for alerts
  private startAlertMonitoring(): void {
    this.alertInterval = setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        console.error('Alert monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  // Collect system metrics
  private async collectMetrics(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60000);
    const fiveMinutesAgo = new Date(now - 300000);

    try {
      // Database queries for business metrics
      const [
        activeOrdersCount,
        recentTransactionsCount,
        openTicketsCount
      ] = await Promise.all([
        db.select({ count: count() })
          .from(orders)
          .where(eq(orders.status, 'active')),
        
        db.select({ count: count() })
          .from(transactions)
          .where(gte(transactions.initiatedAt, oneMinuteAgo)),
        
        db.select({ count: count() })
          .from(supportTickets)
          .where(eq(supportTickets.status, 'OPEN'))
      ]);

      // Get Redis-based metrics
      const redisMetrics = await this.getRedisMetrics();
      
      // System metrics
      const systemMetrics = this.getSystemMetrics();

      // Update current metrics
      this.currentMetrics = {
        activeUsers: redisMetrics.activeUsers,
        activeConnections: redisMetrics.activeConnections,
        onlineDrivers: redisMetrics.onlineDrivers,
        activeOrders: activeOrdersCount[0].count,
        transactionsPerMinute: recentTransactionsCount[0].count,
        responseTime: redisMetrics.averageResponseTime,
        errorRate: redisMetrics.errorRate,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        databaseConnections: systemMetrics.databaseConnections
      };

      // Store metrics in Redis for historical data
      await this.storeMetrics(this.currentMetrics);

    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  // Get Redis-based real-time metrics
  private async getRedisMetrics(): Promise<any> {
    try {
      const [
        activeUserKeys,
        connectionKeys,
        driverKeys,
        responseTimeData,
        errorCount
      ] = await Promise.all([
        this.redis.keys('user:online:*'),
        this.redis.keys('connection:*'),
        this.redis.keys('location:driver:*'),
        this.redis.lrange('metrics:response_time', -100, -1), // Last 100 response times
        this.redis.get('metrics:errors:count') || '0'
      ]);

      const averageResponseTime = responseTimeData.length > 0 
        ? responseTimeData.reduce((sum, time) => sum + parseFloat(time), 0) / responseTimeData.length
        : 0;

      const errorRate = parseInt(errorCount) / Math.max(responseTimeData.length, 1) * 100;

      return {
        activeUsers: activeUserKeys.length,
        activeConnections: connectionKeys.length,
        onlineDrivers: driverKeys.length,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      };
    } catch (error) {
      console.error('Redis metrics error:', error);
      return {
        activeUsers: 0,
        activeConnections: 0,
        onlineDrivers: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }
  }

  // Get system performance metrics
  private getSystemMetrics(): any {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to milliseconds
      memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      databaseConnections: 5 // This would come from your database pool
    };
  }

  // Store metrics in Redis for historical analysis
  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    const timestamp = Date.now();
    const metricsKey = `metrics:historical:${Math.floor(timestamp / 300000) * 300000}`; // 5-minute buckets
    
    await this.redis.hset(metricsKey, {
      ...metrics,
      timestamp
    });
    
    // Set expiration for historical data (keep for 24 hours)
    await this.redis.expire(metricsKey, 24 * 60 * 60);
  }

  // Broadcast metrics to connected clients
  private async broadcastMetrics(): Promise<void> {
    const io = (global as any).io;
    if (io) {
      // Broadcast to admin dashboard
      io.to('admin_monitoring').emit('realtime_metrics', {
        ...this.currentMetrics,
        timestamp: Date.now()
      });

      // Broadcast system health to all connected clients
      io.emit('system_health', {
        status: this.getSystemHealthStatus(),
        timestamp: Date.now()
      });
    }

    // Emit event for other services
    this.emit('metrics_updated', this.currentMetrics);
  }

  // Check for alerts based on thresholds
  private async checkAlerts(): Promise<void> {
    const alerts = [];

    // High CPU usage alert
    if (this.currentMetrics.cpuUsage > 80) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        message: `High CPU usage: ${this.currentMetrics.cpuUsage}%`,
        threshold: 80,
        currentValue: this.currentMetrics.cpuUsage
      });
    }

    // High memory usage alert
    if (this.currentMetrics.memoryUsage > 85) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        message: `High memory usage: ${this.currentMetrics.memoryUsage}%`,
        threshold: 85,
        currentValue: this.currentMetrics.memoryUsage
      });
    }

    // High error rate alert
    if (this.currentMetrics.errorRate > 5) {
      alerts.push({
        type: 'application',
        severity: 'error',
        message: `High error rate: ${this.currentMetrics.errorRate}%`,
        threshold: 5,
        currentValue: this.currentMetrics.errorRate
      });
    }

    // Low driver availability alert
    if (this.currentMetrics.onlineDrivers < 5 && this.currentMetrics.activeOrders > 10) {
      alerts.push({
        type: 'business',
        severity: 'warning',
        message: `Low driver availability: ${this.currentMetrics.onlineDrivers} drivers for ${this.currentMetrics.activeOrders} orders`,
        threshold: 5,
        currentValue: this.currentMetrics.onlineDrivers
      });
    }

    // Slow response time alert
    if (this.currentMetrics.responseTime > 1000) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Slow response time: ${this.currentMetrics.responseTime}ms`,
        threshold: 1000,
        currentValue: this.currentMetrics.responseTime
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  // Send alerts to administrators
  private async sendAlerts(alerts: any[]): Promise<void> {
    const io = (global as any).io;
    if (io) {
      alerts.forEach(alert => {
        io.to('admin_monitoring').emit('system_alert', {
          ...alert,
          timestamp: Date.now(),
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      });
    }

    // Store alerts in Redis for persistence
    for (const alert of alerts) {
      await this.redis.lpush('alerts:active', JSON.stringify({
        ...alert,
        timestamp: Date.now(),
        acknowledged: false
      }));
    }

    // Keep only last 100 alerts
    await this.redis.ltrim('alerts:active', 0, 99);
  }

  // Get current system health status
  private getSystemHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (this.currentMetrics.cpuUsage > 90 || this.currentMetrics.memoryUsage > 95 || this.currentMetrics.errorRate > 10) {
      return 'critical';
    } else if (this.currentMetrics.cpuUsage > 70 || this.currentMetrics.memoryUsage > 80 || this.currentMetrics.errorRate > 3) {
      return 'warning';
    }
    return 'healthy';
  }

  // Get historical metrics
  async getHistoricalMetrics(timeRange: number = 3600000): Promise<any[]> {
    const now = Date.now();
    const startTime = now - timeRange;
    const bucketSize = 300000; // 5 minutes
    
    const buckets = [];
    for (let time = startTime; time <= now; time += bucketSize) {
      const bucketKey = `metrics:historical:${Math.floor(time / bucketSize) * bucketSize}`;
      const metrics = await this.redis.hgetall(bucketKey);
      if (Object.keys(metrics).length > 0) {
        buckets.push({
          timestamp: time,
          ...metrics
        });
      }
    }
    
    return buckets;
  }

  // Track custom metric
  async trackMetric(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    const timestamp = Date.now();
    const metricData: MetricData = {
      timestamp,
      value,
      tags,
      metadata: {}
    };

    // Store in Redis for real-time access
    await this.redis.lpush(`metric:${name}`, JSON.stringify(metricData));
    await this.redis.ltrim(`metric:${name}`, 0, 999); // Keep last 1000 values
    await this.redis.expire(`metric:${name}`, 24 * 60 * 60); // 24 hours
  }

  // Record response time
  async recordResponseTime(time: number): Promise<void> {
    await this.redis.lpush('metrics:response_time', time.toString());
    await this.redis.ltrim('metrics:response_time', 0, 999);
  }

  // Record error
  async recordError(): Promise<void> {
    await this.redis.incr('metrics:errors:count');
    await this.redis.expire('metrics:errors:count', 300); // Reset every 5 minutes
  }

  // Get current metrics
  getCurrentMetrics(): SystemMetrics {
    return { ...this.currentMetrics };
  }

  // Get active alerts
  async getActiveAlerts(): Promise<any[]> {
    const alerts = await this.redis.lrange('alerts:active', 0, -1);
    return alerts.map(alert => JSON.parse(alert));
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, adminId: number): Promise<void> {
    const alerts = await this.redis.lrange('alerts:active', 0, -1);
    const updatedAlerts = alerts.map(alertStr => {
      const alert = JSON.parse(alertStr);
      if (alert.id === alertId) {
        alert.acknowledged = true;
        alert.acknowledgedBy = adminId;
        alert.acknowledgedAt = Date.now();
      }
      return JSON.stringify(alert);
    });

    await this.redis.del('alerts:active');
    if (updatedAlerts.length > 0) {
      await this.redis.lpush('alerts:active', ...updatedAlerts);
    }
  }

  // Shutdown
  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }
    await this.redis.disconnect();
  }
}

// Export singleton instance
export const realTimeAnalytics = new RealTimeAnalytics();

// Middleware to track response times
export const responseTimeMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    await realTimeAnalytics.recordResponseTime(responseTime);
    
    if (res.statusCode >= 400) {
      await realTimeAnalytics.recordError();
    }
  });
  
  next();
};
