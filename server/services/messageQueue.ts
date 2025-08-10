
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface QueueMessage {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  userId?: number;
  metadata?: any;
}

interface QueueOptions {
  maxAttempts?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  delay?: number;
}

export class MessageQueue extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.setupSubscriber();
    this.startProcessing();
  }

  private setupSubscriber(): void {
    this.subscriber.subscribe('queue:notifications');
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'queue:notifications') {
        this.emit('queue_notification', JSON.parse(message));
      }
    });
  }

  // Add message to queue
  async enqueue(
    type: string,
    payload: any,
    options: QueueOptions = {}
  ): Promise<string> {
    const message: QueueMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority: options.priority || 'normal',
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      metadata: {}
    };

    const queueKey = this.getQueueKey(message.priority);
    const score = this.calculateScore(message);

    await this.redis.zadd(queueKey, score, JSON.stringify(message));

    // Notify workers
    await this.redis.publish('queue:notifications', JSON.stringify({
      action: 'new_message',
      queue: queueKey,
      messageId: message.id,
      priority: message.priority
    }));

    return message.id;
  }

  // Add user-specific message to queue
  async enqueueForUser(
    userId: number,
    type: string,
    payload: any,
    options: QueueOptions = {}
  ): Promise<string> {
    const message: QueueMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority: options.priority || 'normal',
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      userId,
      metadata: {}
    };

    const userQueueKey = `queue:user:${userId}`;
    const score = this.calculateScore(message);

    await this.redis.zadd(userQueueKey, score, JSON.stringify(message));

    return message.id;
  }

  // Process queues
  private async startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processQueues();
    }, 1000); // Process every second
  }

  private async processQueues(): Promise<void> {
    try {
      // Process priority queues in order
      const queues = [
        'queue:critical',
        'queue:high',
        'queue:normal',
        'queue:low'
      ];

      for (const queueKey of queues) {
        await this.processQueue(queueKey);
      }

      // Process user-specific queues
      await this.processUserQueues();
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  private async processQueue(queueKey: string): Promise<void> {
    const now = Date.now();
    
    // Get messages that are ready to process (score <= current time)
    const messages = await this.redis.zrangebyscore(
      queueKey,
      '-inf',
      now,
      'LIMIT',
      0,
      10 // Process 10 messages at a time
    );

    for (const messageStr of messages) {
      try {
        const message: QueueMessage = JSON.parse(messageStr);
        
        // Remove from queue before processing
        await this.redis.zrem(queueKey, messageStr);
        
        // Process the message
        const success = await this.processMessage(message);
        
        if (!success && message.attempts < message.maxAttempts) {
          // Retry with exponential backoff
          message.attempts++;
          const retryDelay = Math.pow(2, message.attempts) * 1000; // Exponential backoff
          const retryScore = Date.now() + retryDelay;
          
          await this.redis.zadd(queueKey, retryScore, JSON.stringify(message));
        } else if (!success) {
          // Move to dead letter queue
          await this.moveToDeadLetter(message);
        }
      } catch (error) {
        console.error('Message processing error:', error);
      }
    }
  }

  private async processUserQueues(): Promise<void> {
    const userQueuePattern = 'queue:user:*';
    const userQueues = await this.redis.keys(userQueuePattern);

    for (const queueKey of userQueues) {
      await this.processQueue(queueKey);
    }
  }

  private async processMessage(message: QueueMessage): Promise<boolean> {
    try {
      switch (message.type) {
        case 'push_notification':
          return await this.processPushNotification(message);
        case 'email_notification':
          return await this.processEmailNotification(message);
        case 'sms_notification':
          return await this.processSmsNotification(message);
        case 'websocket_message':
          return await this.processWebSocketMessage(message);
        case 'system_alert':
          return await this.processSystemAlert(message);
        case 'order_update':
          return await this.processOrderUpdate(message);
        case 'payment_notification':
          return await this.processPaymentNotification(message);
        default:
          console.warn(`Unknown message type: ${message.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      return false;
    }
  }

  private async processPushNotification(message: QueueMessage): Promise<boolean> {
    // Implement push notification logic
    console.log('Processing push notification:', message.payload);
    
    // Simulate API call to push notification service
    try {
      // Your push notification service integration here
      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  private async processEmailNotification(message: QueueMessage): Promise<boolean> {
    console.log('Processing email notification:', message.payload);
    
    try {
      // Your email service integration here
      return true;
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }

  private async processSmsNotification(message: QueueMessage): Promise<boolean> {
    console.log('Processing SMS notification:', message.payload);
    
    try {
      // Your SMS service integration here
      return true;
    } catch (error) {
      console.error('SMS notification failed:', error);
      return false;
    }
  }

  private async processWebSocketMessage(message: QueueMessage): Promise<boolean> {
    console.log('Processing WebSocket message:', message.payload);
    
    try {
      const io = (global as any).io;
      if (io) {
        if (message.userId) {
          io.to(`user_${message.userId}`).emit(message.payload.event, message.payload.data);
        } else {
          io.emit(message.payload.event, message.payload.data);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('WebSocket message failed:', error);
      return false;
    }
  }

  private async processSystemAlert(message: QueueMessage): Promise<boolean> {
    console.log('Processing system alert:', message.payload);
    
    try {
      const io = (global as any).io;
      if (io) {
        io.to('admin_monitoring').emit('system_alert', {
          ...message.payload,
          timestamp: Date.now(),
          messageId: message.id
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('System alert failed:', error);
      return false;
    }
  }

  private async processOrderUpdate(message: QueueMessage): Promise<boolean> {
    console.log('Processing order update:', message.payload);
    
    try {
      const io = (global as any).io;
      if (io) {
        const { orderId, ...updateData } = message.payload;
        io.to(`order_${orderId}`).emit('order_update', updateData);
        
        if (message.userId) {
          io.to(`user_${message.userId}`).emit('order_update', updateData);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Order update failed:', error);
      return false;
    }
  }

  private async processPaymentNotification(message: QueueMessage): Promise<boolean> {
    console.log('Processing payment notification:', message.payload);
    
    try {
      const io = (global as any).io;
      if (io && message.userId) {
        io.to(`user_${message.userId}`).emit('payment_update', message.payload);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Payment notification failed:', error);
      return false;
    }
  }

  private getQueueKey(priority: string): string {
    return `queue:${priority}`;
  }

  private calculateScore(message: QueueMessage): number {
    let baseScore = message.timestamp;
    
    // Add delay if specified
    if (message.delay) {
      baseScore += message.delay;
    }
    
    // Adjust score based on priority (lower score = higher priority)
    const priorityAdjustment = {
      'critical': -1000000,
      'high': -100000,
      'normal': 0,
      'low': 100000
    };
    
    return baseScore + (priorityAdjustment[message.priority] || 0);
  }

  private async moveToDeadLetter(message: QueueMessage): Promise<void> {
    const deadLetterKey = 'queue:dead_letter';
    await this.redis.zadd(deadLetterKey, Date.now(), JSON.stringify(message));
    
    console.error(`Message ${message.id} moved to dead letter queue after ${message.attempts} attempts`);
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    const queues = ['critical', 'high', 'normal', 'low'];
    const stats: any = {};
    
    for (const queue of queues) {
      const queueKey = `queue:${queue}`;
      stats[queue] = await this.redis.zcard(queueKey);
    }
    
    stats.deadLetter = await this.redis.zcard('queue:dead_letter');
    stats.userQueues = await this.redis.keys('queue:user:*').then(keys => keys.length);
    
    return stats;
  }

  // Clean up old messages
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;
    const queues = ['queue:critical', 'queue:high', 'queue:normal', 'queue:low', 'queue:dead_letter'];
    
    for (const queue of queues) {
      await this.redis.zremrangebyscore(queue, '-inf', cutoff);
    }
  }

  // Shutdown
  async shutdown(): Promise<void> {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    await this.redis.disconnect();
    await this.subscriber.disconnect();
  }
}

// Export singleton instance
export const messageQueue = new MessageQueue();

// Helper functions for common queue operations
export const queueHelpers = {
  // Queue a push notification
  async queuePushNotification(userId: number, title: string, body: string, data?: any): Promise<string> {
    return await messageQueue.enqueueForUser(userId, 'push_notification', {
      title,
      body,
      data
    }, { priority: 'high' });
  },

  // Queue an email
  async queueEmail(userId: number, subject: string, template: string, data: any): Promise<string> {
    return await messageQueue.enqueueForUser(userId, 'email_notification', {
      subject,
      template,
      data
    }, { priority: 'normal' });
  },

  // Queue a WebSocket message
  async queueWebSocketMessage(userId: number, event: string, data: any): Promise<string> {
    return await messageQueue.enqueueForUser(userId, 'websocket_message', {
      event,
      data
    }, { priority: 'high' });
  },

  // Queue a system alert
  async queueSystemAlert(type: string, message: string, severity: 'info' | 'warning' | 'error' | 'critical'): Promise<string> {
    const priority = severity === 'critical' ? 'critical' : severity === 'error' ? 'high' : 'normal';
    
    return await messageQueue.enqueue('system_alert', {
      type,
      message,
      severity
    }, { priority });
  }
};
