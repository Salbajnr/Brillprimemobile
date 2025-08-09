import { Server as SocketIOServer, Socket } from "socket.io";
import { LiveSystemService } from "../services/live-system";
import { RoleManagementService } from "../services/role-management";
import { AnalyticsService } from "../services/analytics";
import jwt from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
  userName?: string;
}

export class LiveSystemHandler {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`WebSocket connection established: ${socket.id}`);

      // Authentication
      socket.on('authenticate', async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Role Management Events
      socket.on('role:apply', async (data) => {
        await this.handleRoleApplication(socket, data);
      });

      socket.on('role:switch', async (data) => {
        await this.handleRoleSwitch(socket, data);
      });

      // Live System Events
      socket.on('location:update', async (data) => {
        await this.handleLocationUpdate(socket, data);
      });

      socket.on('notification:send', async (data) => {
        await this.handleNotificationSend(socket, data);
      });

      socket.on('notification:read', async (data) => {
        await this.handleNotificationRead(socket, data);
      });

      // Order and Delivery Events
      socket.on('order:status_update', async (data) => {
        await this.handleOrderStatusUpdate(socket, data);
      });

      socket.on('delivery:status_update', async (data) => {
        await this.handleDeliveryStatusUpdate(socket, data);
      });

      socket.on('delivery:location_share', async (data) => {
        await this.handleDeliveryLocationShare(socket, data);
      });

      // Chat and Communication Events
      socket.on('chat:join_room', async (data) => {
        await this.handleJoinChatRoom(socket, data);
      });

      socket.on('chat:leave_room', async (data) => {
        await this.handleLeaveChatRoom(socket, data);
      });

      socket.on('chat:message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      socket.on('chat:typing', async (data) => {
        await this.handleTypingIndicator(socket, data);
      });

      // Analytics Events
      socket.on('analytics:track', async (data) => {
        await this.handleAnalyticsTracking(socket, data);
      });

      socket.on('analytics:interaction', async (data) => {
        await this.handleInteractionTracking(socket, data);
      });

      // System Events
      socket.on('system:heartbeat', async () => {
        await this.handleHeartbeat(socket);
      });

      socket.on('system:presence', async (data) => {
        await this.handlePresenceUpdate(socket, data);
      });

      // Disconnect handler
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`WebSocket error for ${socket.id}:`, error);
      });
    });
  }

  private async handleAuthentication(socket: AuthenticatedSocket, data: any) {
    try {
      const { token } = data;
      
      if (!token) {
        socket.emit('auth:error', { message: 'Authentication token required' });
        return;
      }

      // Verify JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userName = decoded.fullName;

      // Register connection in database
      await LiveSystemService.registerConnection({
        userId: socket.userId!,
        socketId: socket.id,
        userRole: socket.userRole as any,
        connectionType: 'LIVE_CHAT',
        metadata: {
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address,
        },
      });

      // Add to connected users tracking
      this.connectedUsers.set(socket.id, socket);
      
      if (!this.userSockets.has(socket.userId!)) {
        this.userSockets.set(socket.userId!, new Set());
      }
      this.userSockets.get(socket.userId!)!.add(socket.id);

      // Join role-based rooms
      socket.join(`role_${socket.userRole}`);
      socket.join(`user_${socket.userId}`);

      socket.emit('auth:success', {
        userId: socket.userId,
        role: socket.userRole,
        socketId: socket.id,
      });

      console.log(`User ${socket.userId} (${socket.userRole}) authenticated on socket ${socket.id}`);

      // Broadcast user online status
      this.broadcastPresenceUpdate(socket.userId!, 'online', socket.userRole);

    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth:error', { message: 'Invalid authentication token' });
    }
  }

  private async handleRoleApplication(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const result = await RoleManagementService.applyForRole({
        userId: socket.userId!,
        ...data,
      });

      if (result.success) {
        socket.emit('role:application_submitted', result.application);
        
        // Notify admins
        this.io.to('role_ADMIN').emit('role:new_application', {
          application: result.application,
          applicant: { id: socket.userId, name: socket.userName },
        });
      } else {
        socket.emit('role:application_error', { error: result.error });
      }
    } catch (error) {
      console.error('Role application error:', error);
      socket.emit('role:application_error', { error: 'Failed to submit application' });
    }
  }

  private async handleRoleSwitch(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { targetRole } = data;
      const result = await RoleManagementService.switchUserRole(socket.userId!, targetRole);

      if (result.success) {
        // Leave old role room
        socket.leave(`role_${socket.userRole}`);
        
        // Update socket role
        socket.userRole = targetRole;
        
        // Join new role room
        socket.join(`role_${targetRole}`);

        socket.emit('role:switched', { newRole: targetRole });

        // Track the role switch interaction
        await AnalyticsService.trackCrossRoleInteraction({
          initiatorId: socket.userId,
          initiatorRole: socket.userRole as any,
          targetId: socket.userId,
          targetRole: targetRole as any,
          interactionType: 'ROLE_SWITCH' as any,
        });

      } else {
        socket.emit('role:switch_error', { error: result.error });
      }
    } catch (error) {
      console.error('Role switch error:', error);
      socket.emit('role:switch_error', { error: 'Failed to switch role' });
    }
  }

  private async handleLocationUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const result = await LiveSystemService.updateLocation({
        userId: socket.userId,
        userRole: socket.userRole as any,
        ...data,
      });

      if (result.success) {
        socket.emit('location:updated', result.location);

        // Broadcast location to relevant parties based on sharing level
        this.broadcastLocationUpdate(result.location);
      } else {
        socket.emit('location:error', { error: result.error });
      }
    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('location:error', { error: 'Failed to update location' });
    }
  }

  private async handleNotificationSend(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const result = await LiveSystemService.createNotification({
        userId: data.targetUserId || socket.userId,
        ...data,
      });

      if (result.success) {
        socket.emit('notification:sent', result.notification);

        // Send notification to target user
        const targetSockets = this.userSockets.get(data.targetUserId);
        if (targetSockets) {
          targetSockets.forEach(socketId => {
            this.io.to(socketId).emit('notification:received', result.notification);
          });
        }
      } else {
        socket.emit('notification:error', { error: result.error });
      }
    } catch (error) {
      console.error('Notification send error:', error);
      socket.emit('notification:error', { error: 'Failed to send notification' });
    }
  }

  private async handleNotificationRead(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { notificationId } = data;
      const result = await LiveSystemService.markNotificationAsRead(notificationId, socket.userId);

      if (result.success) {
        socket.emit('notification:marked_read', { notificationId });
      } else {
        socket.emit('notification:error', { error: result.error });
      }
    } catch (error) {
      console.error('Notification read error:', error);
      socket.emit('notification:error', { error: 'Failed to mark notification as read' });
    }
  }

  private async handleOrderStatusUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { orderId, status, updates } = data;

      // Broadcast order update to all parties in the order room
      this.io.to(`order_${orderId}`).emit('order:status_changed', {
        orderId,
        status,
        updates,
        updatedBy: socket.userId,
        timestamp: new Date(),
      });

      // Track interaction
      await AnalyticsService.trackCrossRoleInteraction({
        initiatorId: socket.userId,
        initiatorRole: socket.userRole as any,
        targetId: updates.customerId || socket.userId,
        targetRole: 'CONSUMER',
        interactionType: 'ORDER_UPDATE' as any,
        relatedOrderId: orderId,
      });

      socket.emit('order:update_sent', { orderId, status });

    } catch (error) {
      console.error('Order status update error:', error);
      socket.emit('order:error', { error: 'Failed to update order status' });
    }
  }

  private async handleDeliveryStatusUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId || socket.userRole !== 'DRIVER') {
      socket.emit('error', { message: 'Driver authentication required' });
      return;
    }

    try {
      const { deliveryId, status, location, estimatedTime, proof } = data;

      // Broadcast delivery update
      this.io.to(`delivery_${deliveryId}`).emit('delivery:status_changed', {
        deliveryId,
        status,
        location,
        estimatedTime,
        proof,
        driverId: socket.userId,
        timestamp: new Date(),
      });

      socket.emit('delivery:update_sent', { deliveryId, status });

    } catch (error) {
      console.error('Delivery status update error:', error);
      socket.emit('delivery:error', { error: 'Failed to update delivery status' });
    }
  }

  private async handleDeliveryLocationShare(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId || socket.userRole !== 'DRIVER') {
      socket.emit('error', { message: 'Driver authentication required' });
      return;
    }

    try {
      const { deliveryId, location } = data;

      // Share location with customers and merchants for this delivery
      this.io.to(`delivery_${deliveryId}`).emit('delivery:location_update', {
        deliveryId,
        driverId: socket.userId,
        location,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('Delivery location share error:', error);
      socket.emit('delivery:error', { error: 'Failed to share location' });
    }
  }

  private async handleJoinChatRoom(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { roomId, roomType } = data;
      
      socket.join(`chat_${roomId}`);
      
      // Notify others in the room
      socket.to(`chat_${roomId}`).emit('chat:user_joined', {
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        timestamp: new Date(),
      });

      socket.emit('chat:joined', { roomId, roomType });

    } catch (error) {
      console.error('Join chat room error:', error);
      socket.emit('chat:error', { error: 'Failed to join chat room' });
    }
  }

  private async handleLeaveChatRoom(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { roomId } = data;
      
      socket.leave(`chat_${roomId}`);
      
      // Notify others in the room
      socket.to(`chat_${roomId}`).emit('chat:user_left', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date(),
      });

      socket.emit('chat:left', { roomId });

    } catch (error) {
      console.error('Leave chat room error:', error);
      socket.emit('chat:error', { error: 'Failed to leave chat room' });
    }
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const { roomId, message, messageType, attachments } = data;

      const messageData = {
        id: Date.now().toString(),
        roomId,
        senderId: socket.userId,
        senderName: socket.userName,
        senderRole: socket.userRole,
        message,
        messageType: messageType || 'TEXT',
        attachments: attachments || [],
        timestamp: new Date(),
      };

      // Broadcast message to room
      this.io.to(`chat_${roomId}`).emit('chat:message_received', messageData);

      // Track chat interaction
      await AnalyticsService.trackCrossRoleInteraction({
        initiatorId: socket.userId,
        initiatorRole: socket.userRole as any,
        targetId: 0, // Would be determined by room participants
        targetRole: 'CONSUMER', // Would be determined by room type
        interactionType: 'CHAT_MESSAGE' as any,
        relatedChatId: roomId,
      });

    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('chat:error', { error: 'Failed to send message' });
    }
  }

  private async handleTypingIndicator(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      const { roomId, isTyping } = data;

      socket.to(`chat_${roomId}`).emit('chat:typing_indicator', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  private async handleAnalyticsTracking(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      await AnalyticsService.trackUserBehavior({
        userId: socket.userId,
        userRole: socket.userRole as any,
        sessionId: socket.id,
        ...data,
      });

    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  private async handleInteractionTracking(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      await AnalyticsService.trackCrossRoleInteraction({
        initiatorId: socket.userId,
        initiatorRole: socket.userRole as any,
        ...data,
      });

    } catch (error) {
      console.error('Interaction tracking error:', error);
    }
  }

  private async handleHeartbeat(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    try {
      await LiveSystemService.updateConnectionActivity(socket.id);
      socket.emit('system:heartbeat_ack', { timestamp: new Date() });

    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  private async handlePresenceUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      const { status, activity } = data;
      
      this.broadcastPresenceUpdate(socket.userId, status, socket.userRole, activity);

    } catch (error) {
      console.error('Presence update error:', error);
    }
  }

  private async handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`WebSocket disconnected: ${socket.id}`);

    if (socket.userId) {
      // Remove from tracking
      this.connectedUsers.delete(socket.id);
      
      const userSocketsSet = this.userSockets.get(socket.userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          this.userSockets.delete(socket.userId);
          // User is completely offline
          this.broadcastPresenceUpdate(socket.userId, 'offline', socket.userRole);
        }
      }

      // Update database connection status
      await LiveSystemService.disconnectConnection(socket.id);
    }
  }

  private broadcastPresenceUpdate(userId: number, status: string, role?: string, activity?: string) {
    const presenceData = {
      userId,
      status,
      role,
      activity,
      timestamp: new Date(),
    };

    // Broadcast to role-specific rooms
    if (role) {
      this.io.to(`role_${role}`).emit('presence:update', presenceData);
    }

    // Broadcast to specific user connections (for multi-device scenarios)
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit('presence:update', presenceData);
      });
    }
  }

  private broadcastLocationUpdate(location: any) {
    const locationData = {
      userId: location.userId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
      trackingType: location.trackingType,
    };

    // Broadcast based on sharing level
    switch (location.sharingLevel) {
      case 'PUBLIC':
        this.io.emit('location:update', locationData);
        break;
      
      case 'CUSTOMERS_ONLY':
        this.io.to('role_CONSUMER').emit('location:update', locationData);
        break;
      
      case 'MERCHANTS_ONLY':
        this.io.to('role_MERCHANT').emit('location:update', locationData);
        break;
      
      case 'PRIVATE':
        // Only send to user's own connections
        const userSockets = this.userSockets.get(location.userId);
        if (userSockets) {
          userSockets.forEach(socketId => {
            this.io.to(socketId).emit('location:update', locationData);
          });
        }
        break;
    }
  }

  // Public methods for external services to use
  public broadcastToUser(userId: number, event: string, data: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  public broadcastToRole(role: string, event: string, data: any) {
    this.io.to(`role_${role}`).emit(event, data);
  }

  public getConnectedUsers(): number {
    return this.connectedUsers.size;
  }

  public getUsersByRole(role: string): number {
    let count = 0;
    this.connectedUsers.forEach(socket => {
      if (socket.userRole === role) count++;
    });
    return count;
  }
}