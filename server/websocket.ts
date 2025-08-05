import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { storage } from './storage';
import { orderBroadcastingService } from './services/order-broadcasting';

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Define message types for WebSocket communication
export enum MessageType {
  CONNECTION_ACK = 'CONNECTION_ACK',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  NOTIFICATION = 'NOTIFICATION',
  DELIVERY_STATUS = 'DELIVERY_STATUS',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  ERROR = 'ERROR',
  PING = 'PING',
  PONG = 'PONG'
}

// Define client roles
export enum ClientRole {
  CONSUMER = 'CONSUMER',
  DRIVER = 'DRIVER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN'
}

export async function setupWebSocketServer(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Note: Raw WebSocket support commented out for ES module compatibility
  // Consider implementing if needed for E2E tests

  // Track online users and admin connections
  const onlineUsers = new Map<number, string>(); // userId -> socketId
  const adminConnections = new Set<string>(); // socketIds of admin users

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Production WebSocket handlers for real-time features

    // Real-time order status updates
    socket.on('order_status_update', async (data: { orderId: string; status: string; location?: any }) => {
      try {
        const orderTracking = await storage.getOrderTracking(data.orderId);
        if (orderTracking) {
          // Broadcast to all parties involved in the order
          io.to(`order_${data.orderId}`).emit('order_update', {
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            timestamp: Date.now()
          });

          // Send specific notifications to buyer, seller, and driver
          if (orderTracking.buyerId) {
            io.to(`user_${orderTracking.buyerId}`).emit('notification', {
              type: 'order_update',
              title: 'Order Status Update',
              message: `Your order status changed to ${data.status}`,
              orderId: data.orderId
            });
          }
        }
      } catch (error) {
        console.error('Order status update error:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Real-time transaction monitoring for admin
    socket.on('admin_transaction_monitor', (data) => {
      // Join admin monitoring room
      socket.join('admin_transaction_monitoring');
      console.log('Admin joined transaction monitoring');

      // Send current transaction stats
      storage.getTransactionMetrics('1h').then(metrics => {
        socket.emit('initial_transaction_data', {
          totalTransactions: metrics.totalTransactions,
          totalVolume: metrics.totalVolume,
          successRate: metrics.successRate,
          timestamp: Date.now()
        });
      }).catch(console.error);
    });

    // Handle new transaction notifications
    socket.on('transaction_created', async (transactionData) => {
      // Broadcast to all admin monitoring dashboards
      io.to('admin_transaction_monitoring').emit('new_transaction', {
        type: 'transaction_created',
        transaction: transactionData,
        timestamp: Date.now()
      });

      // Check for suspicious activity
      if (transactionData.amount > 100000 || transactionData.flagged) {
        io.to('admin_fraud').emit('suspicious_transaction', {
          type: 'suspicious_transaction',
          transaction: transactionData,
          reason: transactionData.amount > 100000 ? 'high_value' : 'flagged',
          timestamp: Date.now()
        });
      }
    });

    // Driver location updates for real-time tracking
    socket.on('driver_location_update', async (data: { driverId: number; latitude: number; longitude: number }) => {
      try {
        await storage.updateDriverLocation(data.driverId, data.latitude, data.longitude);

        // Broadcast location to all active orders for this driver
        socket.broadcast.emit('driver_location', {
          driverId: data.driverId,
          location: {
            latitude: data.latitude,
            longitude: data.longitude
          },
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Driver location update error:', error);
      }
    });

    // Join user to their personal room for notifications
    socket.on('join_user_room', (userId: number) => {
      socket.join(`user_${userId}`);
      onlineUsers.set(userId, socket.id);

      // Notify admins of user status change
      io.to('admin_user_management').emit('user_status_update', {
        userId,
        isOnline: true,
        timestamp: Date.now()
      });

      console.log(`User ${userId} joined their room`);
    });

    // Admin room management
    socket.on('join_admin_room', (roomType: string) => {
      socket.join(`admin_${roomType}`);
      adminConnections.add(socket.id);
      console.log(`Admin joined room: admin_${roomType}`);
    });

    // Admin user management events
    socket.on('admin_user_action', (data: { userId: number; action: string; timestamp: number }) => {
      // Broadcast to all admin dashboards
      io.to('admin_user_management').emit('admin_action_completed', {
        ...data,
        adminSocket: socket.id
      });

      // Notify the affected user
      io.to(`user_${data.userId}`).emit('account_status_update', {
        action: data.action,
        timestamp: data.timestamp,
        message: `Your account has been ${data.action}d by an administrator`
      });
    });

    // KYC verification events
    socket.on('kyc_review_completed', (data: { 
      documentId: number; 
      action: string; 
      userId: number; 
      timestamp: number 
    }) => {
      // Broadcast to all admin KYC dashboards
      io.to('admin_kyc_verification').emit('kyc_status_updated', {
        documentId: data.documentId,
        status: data.action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedBy: socket.id,
        timestamp: data.timestamp
      });

      // Notify the user about verification status
      io.to(`user_${data.userId}`).emit('verification_status_update', {
        documentId: data.documentId,
        status: data.action === 'approve' ? 'APPROVED' : 'REJECTED',
        timestamp: data.timestamp,
        message: `Your identity verification has been ${data.action}d`
      });
    });

    socket.on('kyc_batch_review_completed', (data: {
      documentIds: number[];
      action: string;
      count: number;
      timestamp: number;
    }) => {
      // Broadcast to all admin KYC dashboards
      io.to('admin_kyc_verification').emit('kyc_batch_update', data);
    });

    // New user registration notification
    socket.on('new_user_registered', (userData: any) => {
      // Notify all admin user management dashboards
      io.to('admin_user_management').emit('new_user_registered', userData);
    });

    // New KYC submission notification
    socket.on('new_kyc_submission', (kycData: any) => {
      // Notify all admin KYC dashboards
      io.to('admin_kyc_verification').emit('new_kyc_submission', kycData);
    });

    // Join order rooms for real-time order updates
    socket.on('join_order_room', (orderId: string) => {
      socket.join(`order_${orderId}`);
      console.log(`Joined order room: ${orderId}`);
    });

    // Join delivery rooms for driver tracking
    socket.on('join_delivery_room', (deliveryId: string) => {
      socket.join(`delivery_${deliveryId}`);
      console.log(`Joined delivery room: ${deliveryId}`);
    });

    // Handle driver location updates
    socket.on('driver_location_update', (data: {
      driverId: number;
      latitude: number;
      longitude: number;
      orderId?: string;
    }) => {
      // Broadcast to order room if orderId is provided
      if (data.orderId) {
        socket.to(`order_${data.orderId}`).emit('driver_location', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: Date.now()
        });
      }
    });

    // Handle payment status updates
    socket.on('payment_status_check', async (reference: string) => {
      try {
        const { transactionService } = await import('./services/transaction');
        const result = await transactionService.verifyPayment(reference);

        socket.emit('payment_status_update', {
          reference,
          status: result.transaction?.status,
          success: result.success,
          timestamp: Date.now()
        });
      } catch (error) {
        socket.emit('payment_status_update', {
          reference,
          status: 'FAILED',
          success: false,
          error: 'Verification failed',
          timestamp: Date.now()
        });
      }
    });

    // Handle live driver tracking subscription
    socket.on('subscribe_driver_tracking', (orderId: string) => {
      socket.join(`tracking_${orderId}`);
      console.log(`Subscribed to driver tracking for order: ${orderId}`);
    });

    // Handle driver location broadcast
    socket.on('broadcast_driver_location', (data: {
      orderId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      // Broadcast to all subscribers of this order's tracking
      socket.to(`tracking_${data.orderId}`).emit('driver_location_realtime', {
        ...data,
        timestamp: Date.now()
      });
    });

    // Handle ETA calculation requests
    socket.on('calculate_eta', async (data: {
      orderId: string;
      driverLocation: { lat: number; lng: number };
      destination: { lat: number; lng: number };
    }) => {
      try {
        const distance = calculateDistance(
          data.driverLocation.lat,
          data.driverLocation.lng,
          data.destination.lat,
          data.destination.lng
        );

        const avgSpeedKmh = 25; // City average with traffic
        const etaMinutes = Math.round((distance / avgSpeedKmh) * 60);

        socket.emit('eta_calculated', {
          orderId: data.orderId,
          eta: `${etaMinutes} minutes`,
          distance: `${distance.toFixed(1)} km`,
          timestamp: Date.now()
        });

        // Broadcast to order room
        io.to(`order_${data.orderId}`).emit('eta_updated', {
          orderId: data.orderId,
          eta: `${etaMinutes} minutes`,
          distance: `${distance.toFixed(1)} km`,
          timestamp: Date.now()
        });
      } catch (error) {
        socket.emit('eta_calculation_error', {
          orderId: data.orderId,
          error: 'Failed to calculate ETA'
        });
      }
    });

    // Handle live map subscription
    socket.on('join_live_map', () => {
      socket.join('live_map');
      console.log('Joined live map tracking');
    });

    // Handle payment confirmation subscription
    socket.on('subscribe_payment_updates', (userId: number) => {
      socket.join(`payments_${userId}`);
      console.log(`Subscribed to payment updates for user: ${userId}`);
    });

    // Handle order status updates
    socket.on('order_status_update', (data: {
      orderId: string;
      status: string;
      userId: number;
      driverId?: number;
    }) => {
      // Broadcast to all parties involved in the order
      io.to(`order_${data.orderId}`).emit('order_status_changed', {
        orderId: data.orderId,
        status: data.status,
        timestamp: Date.now(),
        updatedBy: data.userId
      });

      // Send specific notifications to user and driver
      io.to(`user_${data.userId}`).emit('order_notification', {
        type: 'ORDER_STATUS_UPDATE',
        orderId: data.orderId,
        status: data.status,
        message: `Your order status has been updated to ${data.status}`
      });

      if (data.driverId) {
        io.to(`user_${data.driverId}`).emit('delivery_notification', {
          type: 'ORDER_STATUS_UPDATE',
          orderId: data.orderId,
          status: data.status,
          message: `Order ${data.orderId} status updated to ${data.status}`
        });
      }
    });

    // Handle wallet balance updates
    socket.on('wallet_balance_check', async (userId: number) => {
      try {
        const { storage } = await import('./storage');
        const wallet = await storage.getUserWallet(userId);

        socket.emit('wallet_balance_update', {
          balance: wallet?.balance || '0.00',
          currency: wallet?.currency || 'NGN',
          lastActivity: wallet?.lastActivity
        });
      } catch (error) {
        socket.emit('wallet_balance_update', {
          balance: '0.00',
          currency: 'NGN',
          error: 'Failed to fetch balance'
        });
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data: {
      conversationId: string;
      senderId: number;
      content: string;
      messageType: string;
    }) => {
      try {
        const { storage } = await import('./storage');
        const message = await storage.sendMessage({
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          messageType: data.messageType as any
        });

        // Broadcast to conversation participants
        io.to(`conversation_${data.conversationId}`).emit('new_message', {
          ...message,
          timestamp: Date.now()
        });
      } catch (error) {
        socket.emit('message_error', {
          error: 'Failed to send message'
        });
      }
    });

    // Join conversation rooms
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`Joined conversation: ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data: {
      conversationId: string;
      userId: number;
      userName: string;
    }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: data.userId,
        userName: data.userName,
        timestamp: Date.now()
      });
    });

    socket.on('typing_stop', (data: {
      conversationId: string;
      userId: number;
    }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_stopped_typing', {
        userId: data.userId,
        timestamp: Date.now()
      });
    });

    // Handle emergency notifications for drivers
    socket.on('emergency_alert', (data: {
      driverId: number;
      location: { latitude: number; longitude: number };
      orderId?: string;
      message: string;
    }) => {
      // Broadcast emergency alert to relevant parties
      io.emit('emergency_notification', {
        type: 'DRIVER_EMERGENCY',
        driverId: data.driverId,
        location: data.location,
        orderId: data.orderId,
        message: data.message,
        timestamp: Date.now()
      });
    });

    // Support ticket management events
    socket.on('new_support_ticket', (ticketData: any) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('new_support_ticket', {
        type: 'new_support_ticket',
        ticket: ticketData,
        timestamp: Date.now()
      });

      // Auto-assign high-priority tickets
      if (ticketData.priority === 'HIGH' || ticketData.category === 'payment_issue') {
        io.to('admin_support').emit('urgent_ticket_alert', {
          type: 'urgent_ticket',
          ticket: ticketData,
          message: 'High-priority ticket requires immediate attention',
          timestamp: Date.now()
        });
      }
    });

    // Support ticket message handling
    socket.on('support_ticket_message', async (data: {
      ticketId: string;
      senderId: number;
      message: string;
      attachments?: string[];
    }) => {
      try {
        // Save message to database
        const message = await storage.addSupportMessage({
          ticketId: data.ticketId,
          senderId: data.senderId,
          content: data.message,
          attachments: data.attachments
        });

        // Broadcast to ticket participants
        io.to(`support_ticket_${data.ticketId}`).emit('new_support_message', {
          type: 'new_support_message',
          ticketId: data.ticketId,
          message: message,
          timestamp: Date.now()
        });

        // Notify admin dashboard
        io.to('admin_support').emit('ticket_activity', {
          type: 'message_received',
          ticketId: data.ticketId,
          senderId: data.senderId,
          timestamp: Date.now()
        });
      } catch (error) {
        socket.emit('support_message_error', {
          error: 'Failed to send message'
        });
      }
    });

    socket.on('ticket_status_updated', (data: {
      ticketId: string;
      oldStatus: string;
      newStatus: string;
      updatedBy: number;
    }) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('ticket_status_updated', {
        type: 'ticket_status_updated',
        ...data,
        timestamp: Date.now()
      });
    });

    socket.on('ticket_assigned', (data: {
      ticketId: string;
      assignedTo: number;
      assignedBy: number;
    }) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('ticket_assigned', {
        type: 'ticket_assigned',
        ...data,
        timestamp: Date.now()
      });
    });

    socket.on('ticket_response_sent', (data: {
      ticketId: string;
      response: string;
      sentBy: number;
      customerEmail: string;
    }) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('ticket_response_sent', {
        type: 'ticket_response_sent',
        ...data,
        timestamp: Date.now()
      });

      // Send email notification to customer (in real implementation)
      console.log(`Email notification sent to ${data.customerEmail} for ticket ${data.ticketId}`);
    });

    socket.on('ticket_escalated', (data: {
      ticketId: string;
      oldPriority: string;
      newPriority: string;
      escalatedBy: number;
      reason?: string;
    }) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('ticket_escalated', {
        type: 'ticket_escalated',
        ...data,
        timestamp: Date.now()
      });
    });

    socket.on('tickets_bulk_assigned', (data: {
      ticketIds: string[];
      assignedTo: number;
      assignedBy: number;
      priority?: string;
    }) => {
      // Notify all admin support dashboards
      io.to('admin_support').emit('tickets_bulk_assigned', {
        type: 'tickets_bulk_assigned',
        ...data,
        timestamp: Date.now()
      });
    });

    // Support ticket real-time notifications for customers
    socket.on('join_support_room', (ticketId: string) => {
      socket.join(`support_ticket_${ticketId}`);
      console.log(`Joined support ticket room: ${ticketId}`);
    });

    socket.on('customer_ticket_update', (data: {
      ticketId: string;
      customerId: number;
      update: string;
    }) => {
      // Notify admin dashboards about customer updates
      io.to('admin_support').emit('customer_ticket_update', {
        type: 'customer_ticket_update',
        ...data,
        timestamp: Date.now()
      });
    });

    // Fraud Detection Events
    socket.on('new_fraud_alert', (alertData: any) => {
      // Broadcast to all admin fraud dashboards
      io.to('admin_fraud').emit('fraud_alert', {
        type: 'fraud_alert',
        alert: alertData,
        timestamp: Date.now()
      });
    });

    socket.on('suspicious_activity_detected', (activityData: any) => {
      // Broadcast to all admin fraud dashboards
      io.to('admin_fraud').emit('suspicious_activity', {
        type: 'suspicious_activity',
        activity: activityData,
        timestamp: Date.now()
      });
    });

    socket.on('fraud_alert_updated', (data: {
      alertId: string;
      oldStatus: string;
      newStatus: string;
      updatedBy: number;
    }) => {
      // Notify all admin fraud dashboards
      io.to('admin_fraud').emit('fraud_alert_updated', {
        type: 'fraud_alert_updated',
        ...data,
        timestamp: Date.now()
      });
    });

    // Real-time Monitoring Events
    socket.on('system_metric_update', (metricData: any) => {
      // Broadcast to all admin monitoring dashboards
      io.to('admin_monitoring').emit('system_metric_update', {
        type: 'system_metric_update',
        metrics: metricData,
        timestamp: Date.now()
      });
    });

    socket.on('driver_location_broadcast', (data: {
      driverId: number;
      latitude: number;
      longitude: number;
      status: string;
      orderId?: string;
    }) => {
      // Broadcast to admin monitoring dashboards
      io.to('admin_monitoring').emit('driver_location_update', {
        type: 'driver_location_update',
        ...data,
        timestamp: Date.now()
      });

      // Also broadcast to specific order room if orderId exists
      if (data.orderId) {
        socket.to(`order_${data.orderId}`).emit('driver_location', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
          timestamp: Date.now()
        });
      }
    });

    // Handle rating submissions
    socket.on('submit_rating', (data) => {
      console.log('Rating submitted:', data);

      // Broadcast to the rated user
      if (data.revieweeId) {
        io.to(`user_${data.revieweeId}`).emit('new_rating_received', {
          type: 'NEW_RATING',
          rating: data.rating,
          reviewerName: data.reviewerName,
          comment: data.comment,
          timestamp: Date.now()
        });
      }

      // Broadcast to admin monitoring
      io.to('admin_monitoring').emit('rating_activity', {
        type: 'RATING_SUBMITTED',
        reviewerId: data.reviewerId,
        revieweeId: data.revieweeId,
        rating: data.rating,
        timestamp: Date.now()
      });
    });

    // Handle recommendation interactions
    socket.on('recommendation_interaction', (data) => {
      console.log('Recommendation interaction:', data);

      // Track interaction for analytics
      io.to('admin_monitoring').emit('recommendation_analytics', {
        type: 'INTERACTION_TRACKED',
        userId: data.userId,
        merchantId: data.merchantId,
        interactionType: data.interactionType,
        timestamp: Date.now()
      });
    });

    // Handle toll payment updates
    socket.on('toll_payment_update', (data) => {
      console.log('Toll payment update:', data);

      // Broadcast to admin monitoring
      io.to('admin_monitoring').emit('toll_payment_activity', {
        type: 'TOLL_PAYMENT_UPDATE',
        userId: data.userId,
        amount: data.amount,
        tollGateId: data.tollGateId,
        status: data.status,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      // Remove from online users tracking
      for (const [userId, socketId] of Array.from(onlineUsers.entries())) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);

          // Notify admins of user going offline
          io.to('admin_user_management').emit('user_status_update', {
            userId,
            isOnline: false,
            timestamp: Date.now()
          });
          break;
        }
      }

      // Remove from admin connections
      adminConnections.delete(socket.id);
    });
  });

  // Initialize services with WebSocket server
  try {
    const orderBroadcastingModule = await import('./services/order-broadcasting');
    const liveChatModule = await import('./services/live-chat');

    orderBroadcastingModule.orderBroadcastingService.setSocketServer(io);
    liveChatModule.liveChatService.setSocketServer(io);

    console.log('Real-time services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize real-time services:', error);
  }

  // Make io globally available for use in route handlers
  (global as any).io = io;

  // Periodic cleanup and health checks
  setInterval(async () => {
    try {
      const rooms = io.sockets.adapter.rooms;

      // Get live system metrics from database
      const [systemMetrics, userActivity, transactionMetrics] = await Promise.all([
        storage.getSystemMetrics(),
        storage.getUserActivityMetrics('1h'),
        storage.getTransactionMetrics('1h')
      ]);

      const enhancedMetrics = {
        // Socket.io metrics
        activeRooms: rooms.size,
        connectedClients: io.sockets.sockets.size,
        onlineUsers: onlineUsers.size,
        adminConnections: adminConnections.size,

        // Database metrics
        totalUsers: systemMetrics.totalUsers,
        totalOrders: systemMetrics.totalOrders,
        completedOrders: systemMetrics.completedOrders,
        totalRevenue: systemMetrics.totalRevenue,
        onlineDrivers: systemMetrics.onlineDrivers,

        // Real-time activity
        newUsersLastHour: userActivity.newUsers,
        activeUsersLastHour: userActivity.activeUsers,
        transactionsLastHour: transactionMetrics.totalTransactions,
        revenueLastHour: transactionMetrics.totalVolume,

        // System health
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: Date.now()
      };

      console.log(`Active rooms: ${rooms.size}, Connected clients: ${io.sockets.sockets.size}`);
      console.log(`Online users: ${onlineUsers.size}, Admin connections: ${adminConnections.size}`);

      // Broadcast enhanced system metrics to admin monitoring dashboards
      io.to('admin_monitoring').emit('system_metrics_update', enhancedMetrics);
      io.to('admin_transaction_monitoring').emit('transaction_metrics_update', {
        transactions: transactionMetrics.totalTransactions,
        volume: transactionMetrics.totalVolume,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('System metrics update error:', error);
    }
  }, 30000); // Every 30 seconds for real-time monitoring

  return io;
}