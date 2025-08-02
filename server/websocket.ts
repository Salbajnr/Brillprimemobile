import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export function setupWebSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/ws'
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room for notifications
    socket.on('join_user_room', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
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
          success: result.success
        });
      } catch (error) {
        socket.emit('payment_status_update', {
          reference,
          status: 'FAILED',
          success: false,
          error: 'Verification failed'
        });
      }
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

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Periodic cleanup and health checks
  setInterval(() => {
    const rooms = io.sockets.adapter.rooms;
    console.log(`Active rooms: ${rooms.size}, Connected clients: ${io.sockets.sockets.size}`);
  }, 60000); // Log every minute

  return io;
}