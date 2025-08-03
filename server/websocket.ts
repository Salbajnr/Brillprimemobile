import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

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
    path: '/socket.io'
  });

  // Note: Raw WebSocket support commented out for ES module compatibility
  // Consider implementing if needed for E2E tests

  // Track online users and admin connections
  const onlineUsers = new Map<number, string>(); // userId -> socketId
  const adminConnections = new Set<string>(); // socketIds of admin users

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle test messages for E2E testing
    socket.on('test', (data) => {
      console.log('Test message received:', data);
      socket.emit('message', {
        type: 'test_response',
        data: { message: 'Test message acknowledged', originalData: data }
      });
    });

    // Handle order update test messages
    socket.on('order_update', (data) => {
      console.log('Order update test message:', data);
      socket.emit('message', {
        type: 'order_update',
        data: { orderId: data.orderId, status: data.status }
      });
    });

    // Handle admin notification test messages
    socket.on('admin_notification', (data) => {
      console.log('Admin notification test message:', data);
      socket.emit('message', {
        type: 'admin_notification',
        data: { message: data.message }
      });
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

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      // Remove from online users tracking
      for (const [userId, socketId] of onlineUsers.entries()) {
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
  global.io = io;

  // Periodic cleanup and health checks
  setInterval(() => {
    const rooms = io.sockets.adapter.rooms;
    console.log(`Active rooms: ${rooms.size}, Connected clients: ${io.sockets.sockets.size}`);
    console.log(`Online users: ${onlineUsers.size}, Admin connections: ${adminConnections.size}`);
  }, 60000); // Log every minute

  return io;
}