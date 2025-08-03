import { storage } from '../storage';
import type { Server } from 'socket.io';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: number;
  recipientId?: number;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'LOCATION' | 'ORDER_UPDATE' | 'SYSTEM' | 'VOICE';
  metadata?: {
    orderId?: string;
    location?: { latitude: number; longitude: number };
    imageUrl?: string;
    voiceUrl?: string;
    systemAction?: string;
  };
  timestamp: number;
  readAt?: number;
  deliveredAt?: number;
}

export interface ChatRoom {
  id: string;
  type: 'CUSTOMER_DRIVER' | 'CUSTOMER_MERCHANT' | 'SUPPORT' | 'GROUP';
  participants: number[];
  orderId?: string;
  lastMessage?: ChatMessage;
  createdAt: number;
  isActive: boolean;
}

class LiveChatService {
  private io: Server | null = null;
  private activeRooms: Map<string, ChatRoom> = new Map();
  private userConnections: Map<number, string[]> = new Map(); // userId -> socketIds

  setSocketServer(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Setup WebSocket event handlers for chat
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const userId = socket.handshake.auth?.userId;
      
      if (userId) {
        // Track user connection
        const connections = this.userConnections.get(userId) || [];
        connections.push(socket.id);
        this.userConnections.set(userId, connections);

        // Join user to their personal room
        socket.join(`user_${userId}`);

        // Handle chat events
        socket.on('join_chat_room', (data) => this.handleJoinChatRoom(socket, data));
        socket.on('leave_chat_room', (data) => this.handleLeaveChatRoom(socket, data));
        socket.on('send_message', (data) => this.handleSendMessage(socket, data));
        socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
        socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
        socket.on('mark_message_read', (data) => this.handleMarkMessageRead(socket, data));
        socket.on('request_chat_history', (data) => this.handleChatHistory(socket, data));

        socket.on('disconnect', () => {
          // Clean up user connections
          const connections = this.userConnections.get(userId) || [];
          const updatedConnections = connections.filter(id => id !== socket.id);
          
          if (updatedConnections.length === 0) {
            this.userConnections.delete(userId);
            // Emit user offline status
            this.broadcastUserStatus(userId, false);
          } else {
            this.userConnections.set(userId, updatedConnections);
          }
        });

        // Emit user online status
        this.broadcastUserStatus(userId, true);
      }
    });
  }

  /**
   * Create or get chat room for customer-driver communication
   */
  async createCustomerDriverChat(orderId: string, customerId: number, driverId: number): Promise<ChatRoom> {
    const roomId = `order_${orderId}_customer_driver`;
    
    let room = this.activeRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        type: 'CUSTOMER_DRIVER',
        participants: [customerId, driverId],
        orderId,
        createdAt: Date.now(),
        isActive: true
      };
      
      this.activeRooms.set(roomId, room);

      // Create conversation in database
      try {
        await storage.createConversation({
          id: roomId,
          customerId,
          vendorId: driverId,
          conversationType: 'ORDER',
          status: 'ACTIVE'
        });
      } catch (error) {
        console.error('Failed to create conversation in database:', error);
      }
    }

    return room;
  }

  /**
   * Create or get chat room for customer-merchant communication
   */
  async createCustomerMerchantChat(customerId: number, merchantId: number, orderId?: string): Promise<ChatRoom> {
    const roomId = orderId ? `order_${orderId}_customer_merchant` : `customer_${customerId}_merchant_${merchantId}`;
    
    let room = this.activeRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        type: 'CUSTOMER_MERCHANT',
        participants: [customerId, merchantId],
        orderId,
        createdAt: Date.now(),
        isActive: true
      };
      
      this.activeRooms.set(roomId, room);

      // Create conversation in database
      try {
        await storage.createConversation({
          id: roomId,
          customerId,
          vendorId: merchantId,
          conversationType: 'ORDER',
          status: 'ACTIVE'
        });
      } catch (error) {
        console.error('Failed to create conversation in database:', error);
      }
    }

    return room;
  }

  /**
   * Create support chat room
   */
  async createSupportChat(userId: number, issueType: string, orderId?: string): Promise<ChatRoom> {
    const roomId = `support_${userId}_${Date.now()}`;
    
    const room: ChatRoom = {
      id: roomId,
      type: 'SUPPORT',
      participants: [userId], // Support agents will join dynamically
      orderId,
      createdAt: Date.now(),
      isActive: true
    };
    
    this.activeRooms.set(roomId, room);

    // Notify support team
    if (this.io) {
      this.io.to('support_team').emit('new_support_request', {
        roomId,
        userId,
        issueType,
        orderId,
        timestamp: Date.now()
      });
    }

    return room;
  }

  /**
   * Handle joining chat room
   */
  private async handleJoinChatRoom(socket: any, data: { roomId: string; userId: number }) {
    const room = this.activeRooms.get(data.roomId);
    
    if (room && room.participants.includes(data.userId)) {
      socket.join(data.roomId);
      
      // Emit join confirmation
      socket.emit('chat_room_joined', {
        roomId: data.roomId,
        participants: room.participants,
        type: room.type,
        orderId: room.orderId
      });

      // Notify other participants
      socket.to(data.roomId).emit('user_joined_chat', {
        userId: data.userId,
        timestamp: Date.now()
      });

      // Send recent chat history
      await this.sendChatHistory(socket, data.roomId, 50);
    }
  }

  /**
   * Handle leaving chat room
   */
  private handleLeaveChatRoom(socket: any, data: { roomId: string; userId: number }) {
    socket.leave(data.roomId);
    
    socket.to(data.roomId).emit('user_left_chat', {
      userId: data.userId,
      timestamp: Date.now()
    });
  }

  /**
   * Handle sending message
   */
  private async handleSendMessage(socket: any, data: {
    roomId: string;
    senderId: number;
    content: string;
    messageType: string;
    metadata?: any;
  }) {
    try {
      const room = this.activeRooms.get(data.roomId);
      if (!room || !room.participants.includes(data.senderId)) {
        return;
      }

      // Create message
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${data.senderId}`,
        conversationId: data.roomId,
        senderId: data.senderId,
        content: data.content,
        messageType: data.messageType as any,
        metadata: data.metadata,
        timestamp: Date.now(),
        deliveredAt: Date.now()
      };

      // Save to database
      try {
        await storage.sendMessage({
          id: message.id,
          conversationId: data.roomId,
          senderId: data.senderId,
          content: data.content,
          messageType: data.messageType as any
        });
      } catch (error) {
        console.error('Failed to save message to database:', error);
      }

      // Update room's last message
      room.lastMessage = message;
      this.activeRooms.set(data.roomId, room);

      // Broadcast to room participants
      this.io!.to(data.roomId).emit('new_message', message);

      // Send push notifications to offline participants
      await this.sendPushNotifications(room, message);

      // Handle special message types
      await this.handleSpecialMessageTypes(message, room);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', {
        error: 'Failed to send message',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle typing indicators
   */
  private handleTypingStart(socket: any, data: { roomId: string; userId: number }) {
    socket.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      isTyping: true,
      timestamp: Date.now()
    });
  }

  private handleTypingStop(socket: any, data: { roomId: string; userId: number }) {
    socket.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      isTyping: false,
      timestamp: Date.now()
    });
  }

  /**
   * Handle marking messages as read
   */
  private async handleMarkMessageRead(socket: any, data: { messageId: string; userId: number }) {
    try {
      // Update read status in database
      // This would require updating your message schema to include read receipts
      
      // Emit read receipt
      socket.broadcast.emit('message_read', {
        messageId: data.messageId,
        readBy: data.userId,
        readAt: Date.now()
      });
    } catch (error) {
      console.error('Mark message read error:', error);
    }
  }

  /**
   * Send chat history
   */
  private async handleChatHistory(socket: any, data: { roomId: string; limit?: number; offset?: number }) {
    await this.sendChatHistory(socket, data.roomId, data.limit || 50, data.offset || 0);
  }

  private async sendChatHistory(socket: any, roomId: string, limit: number, offset: number = 0) {
    try {
      // Get messages from database
      const messages = await storage.getConversationMessages(roomId, limit, offset);
      
      socket.emit('chat_history', {
        roomId,
        messages,
        hasMore: messages.length === limit
      });
    } catch (error) {
      console.error('Chat history error:', error);
    }
  }

  /**
   * Broadcast user online/offline status
   */
  private broadcastUserStatus(userId: number, isOnline: boolean) {
    if (!this.io) return;

    // Find all rooms this user participates in
    const roomsArray = Array.from(this.activeRooms.values());
    for (const room of roomsArray) {
      if (room.participants.includes(userId)) {
        this.io.to(room.id).emit('user_status_change', {
          userId,
          isOnline,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Send push notifications to offline users
   */
  private async sendPushNotifications(room: ChatRoom, message: ChatMessage) {
    const offlineParticipants = room.participants.filter(userId => 
      !this.userConnections.has(userId)
    );

    for (const userId of offlineParticipants) {
      // This would integrate with your push notification service
      // For now, we'll just log it
      console.log(`Push notification needed for user ${userId}: ${message.content}`);
    }
  }

  /**
   * Handle special message types (location, order updates, etc.)
   */
  private async handleSpecialMessageTypes(message: ChatMessage, room: ChatRoom) {
    switch (message.messageType) {
      case 'LOCATION':
        if (message.metadata?.location && room.orderId) {
          // Update driver location for order tracking
          await storage.updateOrderTracking(room.orderId, 'in_transit', message.metadata.location);
        }
        break;

      case 'ORDER_UPDATE':
        if (message.metadata?.orderId) {
          // Broadcast order update to relevant parties
          this.io!.to(`order_${message.metadata.orderId}`).emit('order_update_from_chat', {
            orderId: message.metadata.orderId,
            update: message.content,
            updatedBy: message.senderId,
            timestamp: message.timestamp
          });
        }
        break;
    }
  }

  /**
   * Get active chat rooms for a user
   */
  async getUserChatRooms(userId: number): Promise<ChatRoom[]> {
    const userRooms: ChatRoom[] = [];
    
    for (const room of this.activeRooms.values()) {
      if (room.participants.includes(userId) && room.isActive) {
        userRooms.push(room);
      }
    }

    return userRooms;
  }

  /**
   * Close chat room
   */
  async closeChatRoom(roomId: string) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.isActive = false;
      this.activeRooms.set(roomId, room);

      // Notify participants
      if (this.io) {
        this.io.to(roomId).emit('chat_room_closed', {
          roomId,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Add support agent to support chat
   */
  async addSupportAgentToChat(roomId: string, agentId: number) {
    const room = this.activeRooms.get(roomId);
    if (room && room.type === 'SUPPORT') {
      if (!room.participants.includes(agentId)) {
        room.participants.push(agentId);
        this.activeRooms.set(roomId, room);

        // Notify room participants
        if (this.io) {
          this.io.to(roomId).emit('support_agent_joined', {
            agentId,
            timestamp: Date.now()
          });
        }
      }
    }
  }
}

export const liveChatService = new LiveChatService();