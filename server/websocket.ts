import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { storage } from "./storage";
import jwt from 'jsonwebtoken';

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

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
  userName?: string;
}

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

  // Make io globally available
  (global as any).io = io;

  // Track online users and admin connections
  const onlineUsers = new Map<number, string>(); // userId -> socketId
  const adminConnections = new Set<string>(); // socketIds of admin users
  const roomParticipants = new Map<string, Set<number>>(); // roomId -> Set of userIds

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('WebSocket connection established:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (data: { token?: string; userId?: number }) => {
      try {
        if (data.token) {
          const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
          const decoded = jwt.verify(data.token, JWT_SECRET) as any;
          socket.userId = decoded.userId;
          socket.userRole = decoded.role;
          socket.userName = decoded.fullName;
        } else if (data.userId) {
          // For testing purposes, allow direct userId authentication
          const user = await storage.getUser(data.userId);
          if (user) {
            socket.userId = user.id;
            socket.userRole = user.role;
            socket.userName = user.fullName;
          }
        }

        if (socket.userId) {
          // Track user connection
          onlineUsers.set(socket.userId, socket.id);

          // Join role-based rooms
          socket.join(`role_${socket.userRole}`);
          socket.join(`user_${socket.userId}`);

          if (socket.userRole === 'ADMIN') {
            adminConnections.add(socket.id);
            socket.join('admin_monitoring');
          }

          socket.emit('authenticated', {
            userId: socket.userId,
            role: socket.userRole,
            socketId: socket.id
          });

          console.log(`User ${socket.userId} (${socket.userRole}) authenticated`);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { message: 'Invalid authentication' });
      }
    });

    // Real-time order status updates
    socket.on('order_status_update', async (data: { 
      orderId: string; 
      status: string; 
      location?: any;
      driverId?: number;
      notes?: string;
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const orderTracking = await storage.getOrderTracking(data.orderId);
        if (orderTracking) {
          // Update order status in database
          await storage.updateOrderTracking(data.orderId, data.status, data.location);

          // Broadcast to all parties involved in the order
          const updateData = {
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            driverId: data.driverId,
            notes: data.notes,
            timestamp: Date.now(),
            updatedBy: socket.userId
          };

          // Notify customer
          if (orderTracking.buyerId) {
            io.to(`user_${orderTracking.buyerId}`).emit('order_update', updateData);
          }

          // Notify merchant
          if (orderTracking.sellerId) {
            io.to(`user_${orderTracking.sellerId}`).emit('order_update', updateData);
          }

          // Notify driver if different from updater
          if (data.driverId && data.driverId !== socket.userId) {
            io.to(`user_${data.driverId}`).emit('order_update', updateData);
          }

          // Broadcast to order room
          io.to(`order_${data.orderId}`).emit('order_status_changed', updateData);

          // Notify admins
          adminConnections.forEach(adminSocketId => {
            io.to(adminSocketId).emit('admin_order_update', updateData);
          });
        }
      } catch (error) {
        console.error('Order status update error:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Real-time location updates
    socket.on('location_update', async (data: {
      latitude: number;
      longitude: number;
      orderId?: string;
      heading?: number;
      speed?: number;
    }) => {
      try {
        if (!socket.userId || socket.userRole !== 'DRIVER') {
          socket.emit('error', { message: 'Driver authentication required' });
          return;
        }

        // Update driver location in database
        await storage.updateDriverLocation(socket.userId, {
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString()
        });

        const locationData = {
          driverId: socket.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          timestamp: Date.now()
        };

        // If orderId provided, update specific order tracking
        if (data.orderId) {
          const orderTracking = await storage.getOrderTracking(data.orderId);
          if (orderTracking) {
            // Calculate ETA (simplified calculation)
            let etaMinutes = null;
            if (orderTracking.deliveryLatitude && orderTracking.deliveryLongitude) {
              const distance = calculateDistance(
                data.latitude, 
                data.longitude,
                parseFloat(orderTracking.deliveryLatitude),
                parseFloat(orderTracking.deliveryLongitude)
              );
              etaMinutes = Math.round((distance / 30) * 60); // 30 km/h average
            }

            const trackingUpdate = {
              ...locationData,
              orderId: data.orderId,
              eta: etaMinutes ? `${etaMinutes} minutes` : null,
              distance: orderTracking.deliveryLatitude ? 
                calculateDistance(
                  data.latitude, data.longitude,
                  parseFloat(orderTracking.deliveryLatitude),
                  parseFloat(orderTracking.deliveryLongitude)
                ).toFixed(1) + ' km' : null
            };

            // Notify customer
            if (orderTracking.buyerId) {
              io.to(`user_${orderTracking.buyerId}`).emit('driver_location_update', trackingUpdate);
            }

            // Notify merchant
            if (orderTracking.sellerId) {
              io.to(`user_${orderTracking.sellerId}`).emit('driver_location_update', trackingUpdate);
            }

            // Update order room
            io.to(`order_${data.orderId}`).emit('driver_location_update', trackingUpdate);
          }
        }

        // Broadcast to admin monitoring
        io.to('admin_monitoring').emit('driver_location_update', locationData);

      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Chat system events
    socket.on('join_chat_room', async (data: { roomId: string; roomType: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(data.roomId);

        // Track room participants
        if (!roomParticipants.has(data.roomId)) {
          roomParticipants.set(data.roomId, new Set());
        }
        roomParticipants.get(data.roomId)!.add(socket.userId);

        // Notify others in room
        socket.to(data.roomId).emit('user_joined_chat', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: Date.now()
        });

        socket.emit('chat_room_joined', {
          roomId: data.roomId,
          participants: Array.from(roomParticipants.get(data.roomId) || [])
        });

        console.log(`User ${socket.userId} joined chat room ${data.roomId}`);
      } catch (error) {
        console.error('Join chat room error:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    socket.on('send_chat_message', async (data: {
      roomId: string;
      message: string;
      messageType?: string;
      attachments?: any[];
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const messageData = {
          id: `msg_${Date.now()}_${socket.userId}`,
          roomId: data.roomId,
          senderId: socket.userId,
          senderName: socket.userName,
          senderRole: socket.userRole,
          message: data.message,
          messageType: data.messageType || 'TEXT',
          attachments: data.attachments || [],
          timestamp: Date.now()
        };

        // Save message to database (if implemented)
        try {
          await storage.sendMessage({
            id: messageData.id,
            conversationId: data.roomId,
            senderId: socket.userId,
            content: data.message,
            messageType: (data.messageType || 'TEXT') as any
          });
        } catch (error) {
          console.error('Failed to save message:', error);
        }

        // Broadcast to room
        io.to(data.roomId).emit('chat_message_received', messageData);

        console.log(`Message sent in room ${data.roomId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Send chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', (data: { roomId: string }) => {
      if (socket.userId) {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', (data: { roomId: string }) => {
      if (socket.userId) {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping: false
        });
      }
    });

    // Notification system
    socket.on('send_notification', async (data: {
      targetUserId?: number;
      targetRole?: string;
      title: string;
      message: string;
      type: string;
      orderId?: string;
    }) => {
      try {
        const notificationData = {
          id: Date.now(),
          title: data.title,
          message: data.message,
          type: data.type,
          orderId: data.orderId,
          timestamp: Date.now(),
          senderId: socket.userId
        };

        // Send to specific user
        if (data.targetUserId) {
          io.to(`user_${data.targetUserId}`).emit('notification', notificationData);
        }

        // Send to all users of a specific role
        if (data.targetRole) {
          io.to(`role_${data.targetRole}`).emit('notification', notificationData);
        }

        socket.emit('notification_sent', { success: true });
      } catch (error) {
        console.error('Send notification error:', error);
        socket.emit('error', { message: 'Failed to send notification' });
      }
    });

    // Order tracking subscription
    socket.on('subscribe_order_tracking', (orderId: string) => {
      if (socket.userId) {
        socket.join(`order_${orderId}`);
        console.log(`User ${socket.userId} subscribed to order tracking for ${orderId}`);
      }
    });

    socket.on('unsubscribe_order_tracking', (orderId: string) => {
      if (socket.userId) {
        socket.leave(`order_${orderId}`);
        console.log(`User ${socket.userId} unsubscribed from order tracking for ${orderId}`);
      }
    });

    // Heartbeat/Ping-Pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected:', socket.id);

      if (socket.userId) {
        // Remove from tracking
        onlineUsers.delete(socket.userId);
        adminConnections.delete(socket.id);

        // Clean up room participants
        roomParticipants.forEach((participants, roomId) => {
          if (participants.has(socket.userId!)) {
            participants.delete(socket.userId!);
            // Notify others in room
            socket.to(roomId).emit('user_left_chat', {
              userId: socket.userId,
              userName: socket.userName,
              timestamp: Date.now()
            });
          }
        });

        // Broadcast user offline status
        io.emit('user_status_change', {
          userId: socket.userId,
          isOnline: false,
          timestamp: Date.now()
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.id}:`, error);
    });

    // Send connection acknowledgment
    socket.emit(MessageType.CONNECTION_ACK, {
      socketId: socket.id,
      timestamp: Date.now(),
      message: 'Connected to BrillPrime WebSocket server'
    });
  });

  console.log('WebSocket server initialized successfully');
  return io;
}