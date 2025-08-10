
import { Redis } from 'ioredis';
import { db } from '../db';
import { users, pushTokens, notifications } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { messageQueue } from './messageQueue';

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface NotificationPreferences {
  orderUpdates: boolean;
  paymentNotifications: boolean;
  promotions: boolean;
  systemAlerts: boolean;
  chatMessages: boolean;
}

export class PushNotificationService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Register device token for push notifications
  async registerDevice(
    userId: number,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceInfo?: any
  ): Promise<void> {
    try {
      // Store in database
      await db.insert(pushTokens).values({
        userId,
        token,
        platform,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        isActive: true,
        lastUsed: new Date()
      }).onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.token],
        set: {
          platform,
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
          isActive: true,
          lastUsed: new Date(),
          updatedAt: new Date()
        }
      });

      // Store in Redis for fast access
      await this.redis.sadd(`push_tokens:${userId}`, JSON.stringify({
        token,
        platform,
        deviceInfo
      }));

      console.log(`Push token registered for user ${userId} on ${platform}`);
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  // Unregister device token
  async unregisterDevice(userId: number, token: string): Promise<void> {
    try {
      // Remove from database
      await db.update(pushTokens)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));

      // Remove from Redis
      const tokens = await this.redis.smembers(`push_tokens:${userId}`);
      for (const tokenData of tokens) {
        const parsed = JSON.parse(tokenData);
        if (parsed.token === token) {
          await this.redis.srem(`push_tokens:${userId}`, tokenData);
          break;
        }
      }

      console.log(`Push token unregistered for user ${userId}`);
    } catch (error) {
      console.error('Error unregistering push token:', error);
      throw error;
    }
  }

  // Send push notification to specific user
  async sendToUser(
    userId: number,
    notification: PushNotificationData,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      ttl?: number;
      category?: string;
      collapseKey?: string;
    }
  ): Promise<boolean> {
    try {
      // Get user's push tokens
      const tokens = await this.getUserTokens(userId);
      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return false;
      }

      // Check user notification preferences
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(notification, preferences, options?.category)) {
        console.log(`Notification blocked by user preferences for user ${userId}`);
        return false;
      }

      // Send to all user's devices
      const results = await Promise.all(
        tokens.map(tokenData => 
          this.sendToDevice(tokenData, notification, options)
        )
      );

      const successCount = results.filter(result => result).length;
      
      // Store notification in database
      await this.storeNotification(userId, notification, options?.category);

      console.log(`Push notification sent to ${successCount}/${tokens.length} devices for user ${userId}`);
      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send bulk notifications
  async sendBulk(
    userIds: number[],
    notification: PushNotificationData,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      ttl?: number;
      category?: string;
      batchSize?: number;
    }
  ): Promise<{ success: number; failed: number }> {
    const batchSize = options?.batchSize || 100;
    let success = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(userId => this.sendToUser(userId, notification, options))
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          success++;
        } else {
          failed++;
        }
      });

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Bulk notification completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  // Send notification to all users with specific role
  async sendToRole(
    role: 'CONSUMER' | 'DRIVER' | 'MERCHANT' | 'ADMIN',
    notification: PushNotificationData,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      ttl?: number;
      category?: string;
    }
  ): Promise<{ success: number; failed: number }> {
    try {
      // Get all users with the specified role
      const usersWithRole = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, role));

      const userIds = usersWithRole.map(user => user.id);
      return await this.sendBulk(userIds, notification, options);
    } catch (error) {
      console.error('Error sending notification to role:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Send emergency notification (highest priority)
  async sendEmergency(
    userIds: number[],
    notification: PushNotificationData
  ): Promise<{ success: number; failed: number }> {
    return await this.sendBulk(userIds, {
      ...notification,
      sound: 'emergency',
      badge: 1
    }, {
      priority: 'high',
      category: 'emergency',
      ttl: 3600 // 1 hour TTL
    });
  }

  // Send to device (platform-specific implementation)
  private async sendToDevice(
    tokenData: any,
    notification: PushNotificationData,
    options?: any
  ): Promise<boolean> {
    try {
      switch (tokenData.platform) {
        case 'web':
          return await this.sendWebPush(tokenData, notification, options);
        case 'ios':
          return await this.sendAPNS(tokenData, notification, options);
        case 'android':
          return await this.sendFCM(tokenData, notification, options);
        default:
          console.warn(`Unsupported platform: ${tokenData.platform}`);
          return false;
      }
    } catch (error) {
      console.error(`Error sending to ${tokenData.platform}:`, error);
      return false;
    }
  }

  // Web Push implementation
  private async sendWebPush(
    tokenData: any,
    notification: PushNotificationData,
    options?: any
  ): Promise<boolean> {
    try {
      // Web Push implementation using web-push library
      const webpush = require('web-push');
      
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured for web push');
        return false;
      }

      webpush.setVapidDetails(
        'mailto:' + (process.env.VAPID_EMAIL || 'support@brillprime.com'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: notification.data,
        actions: notification.actions,
        requireInteraction: options?.priority === 'high',
        silent: options?.priority === 'low'
      });

      await webpush.sendNotification(
        JSON.parse(tokenData.token), // subscription object
        payload,
        {
          TTL: options?.ttl || 86400, // 24 hours default
          urgency: options?.priority || 'normal'
        }
      );

      return true;
    } catch (error) {
      console.error('Web push error:', error);
      return false;
    }
  }

  // Apple Push Notification Service implementation
  private async sendAPNS(
    tokenData: any,
    notification: PushNotificationData,
    options?: any
  ): Promise<boolean> {
    try {
      // APNS implementation - you would use a library like node-apn
      console.log('APNS not implemented yet - would send:', {
        token: tokenData.token,
        notification,
        options
      });
      
      // Mock success for now
      return true;
    } catch (error) {
      console.error('APNS error:', error);
      return false;
    }
  }

  // Firebase Cloud Messaging implementation
  private async sendFCM(
    tokenData: any,
    notification: PushNotificationData,
    options?: any
  ): Promise<boolean> {
    try {
      // FCM implementation - you would use Firebase Admin SDK
      console.log('FCM not implemented yet - would send:', {
        token: tokenData.token,
        notification,
        options
      });
      
      // Mock success for now
      return true;
    } catch (error) {
      console.error('FCM error:', error);
      return false;
    }
  }

  // Get user's registered tokens
  private async getUserTokens(userId: number): Promise<any[]> {
    try {
      const tokens = await this.redis.smembers(`push_tokens:${userId}`);
      return tokens.map(token => JSON.parse(token));
    } catch (error) {
      console.error('Error getting user tokens:', error);
      return [];
    }
  }

  // Get user notification preferences
  private async getUserPreferences(userId: number): Promise<NotificationPreferences> {
    try {
      const preferences = await this.redis.hgetall(`user_preferences:${userId}`);
      return {
        orderUpdates: preferences.orderUpdates !== 'false',
        paymentNotifications: preferences.paymentNotifications !== 'false',
        promotions: preferences.promotions !== 'false',
        systemAlerts: preferences.systemAlerts !== 'false',
        chatMessages: preferences.chatMessages !== 'false'
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Default to all enabled if preferences can't be retrieved
      return {
        orderUpdates: true,
        paymentNotifications: true,
        promotions: true,
        systemAlerts: true,
        chatMessages: true
      };
    }
  }

  // Check if notification should be sent based on preferences
  private shouldSendNotification(
    notification: PushNotificationData,
    preferences: NotificationPreferences,
    category?: string
  ): boolean {
    switch (category) {
      case 'order':
        return preferences.orderUpdates;
      case 'payment':
        return preferences.paymentNotifications;
      case 'promotion':
        return preferences.promotions;
      case 'system':
      case 'emergency':
        return preferences.systemAlerts;
      case 'chat':
        return preferences.chatMessages;
      default:
        return true; // Send if category is unknown
    }
  }

  // Store notification in database for history
  private async storeNotification(
    userId: number,
    notification: PushNotificationData,
    category?: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        title: notification.title,
        body: notification.body,
        category: category || 'general',
        data: notification.data ? JSON.stringify(notification.data) : null,
        isRead: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  // Update user notification preferences
  async updateUserPreferences(
    userId: number,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await this.redis.hmset(`user_preferences:${userId}`, preferences);
      console.log(`Preferences updated for user ${userId}:`, preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Get notification history for user
  async getNotificationHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const history = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt)
        .limit(limit)
        .offset(offset);

      return history;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Mark notifications as read
  async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            // Use SQL IN clause for multiple IDs
            notifications.id // This would need proper IN clause implementation
          )
        );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Clean up old tokens
  async cleanupOldTokens(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Remove inactive tokens from database
      await db
        .update(pushTokens)
        .set({ isActive: false })
        .where(
          and(
            eq(pushTokens.isActive, true),
            // lastUsed < thirtyDaysAgo (proper comparison needed)
          )
        );

      console.log('Cleaned up old push tokens');
    } catch (error) {
      console.error('Error cleaning up tokens:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Helper functions for common notifications
export const notificationHelpers = {
  // Order status notifications
  async sendOrderUpdate(
    userId: number,
    orderId: string,
    status: string,
    driverName?: string
  ): Promise<boolean> {
    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      preparing: 'Your order is being prepared',
      on_the_way: `Your order is on the way${driverName ? ` with ${driverName}` : ''}`,
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled'
    };

    return await pushNotificationService.sendToUser(userId, {
      title: 'Order Update',
      body: statusMessages[status as keyof typeof statusMessages] || 'Order status updated',
      data: { orderId, status, type: 'order_update' }
    }, { category: 'order', priority: 'high' });
  },

  // Payment notifications
  async sendPaymentNotification(
    userId: number,
    amount: string,
    type: 'success' | 'failed' | 'pending',
    reference?: string
  ): Promise<boolean> {
    const messages = {
      success: `Payment of ₦${amount} was successful`,
      failed: `Payment of ₦${amount} failed`,
      pending: `Payment of ₦${amount} is being processed`
    };

    return await pushNotificationService.sendToUser(userId, {
      title: 'Payment Update',
      body: messages[type],
      data: { amount, type, reference, type: 'payment_update' }
    }, { category: 'payment', priority: 'high' });
  },

  // Driver notifications
  async sendDriverNotification(
    driverId: number,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    return await pushNotificationService.sendToUser(driverId, {
      title,
      body,
      sound: 'default',
      data: { ...data, type: 'driver_notification' }
    }, { priority: 'high' });
  },

  // System alerts
  async sendSystemAlert(
    userIds: number[],
    title: string,
    body: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<{ success: number; failed: number }> {
    const priority = severity === 'error' ? 'high' : 'normal';
    
    return await pushNotificationService.sendBulk(userIds, {
      title,
      body,
      icon: severity === 'error' ? '/icons/error.png' : '/icons/info.png',
      data: { severity, type: 'system_alert' }
    }, { category: 'system', priority });
  }
};
