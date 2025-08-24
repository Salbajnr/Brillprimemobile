import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { liveChatService } from "../services/live-chat";
import { db } from "../db";
import { chatMessages } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Live Chat schemas
const startChatSchema = z.object({
  type: z.enum(['CUSTOMER_DRIVER', 'CUSTOMER_MERCHANT', 'CUSTOMER_SUPPORT']),
  recipientId: z.coerce.number().positive().optional(),
  orderId: z.string().uuid().optional(),
  issueType: z.string().optional()
});

const sendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(2000).trim(),
  messageType: z.enum(['TEXT', 'IMAGE', 'LOCATION', 'QUICK_RESPONSE']).default('TEXT'),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    size: z.number().optional()
  })).optional()
});

const getChatHistorySchema = z.object({
  roomId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

export function registerLiveChatRoutes(app: Express) {
  // Start a new chat conversation
  app.post("/api/chat/start", requireAuth, async (req, res) => {
    try {
      const data = startChatSchema.parse(req.body);
      const userId = req.session!.userId!;

      let chatRoom;

      switch (data.type) {
        case 'CUSTOMER_DRIVER':
          if (!data.recipientId || !data.orderId) {
            return res.status(400).json({
              success: false,
              message: "Driver ID and Order ID are required for customer-driver chat"
            });
          }
          chatRoom = await liveChatService.createCustomerDriverChat(
            data.orderId,
            userId,
            data.recipientId
          );
          break;

        case 'CUSTOMER_MERCHANT':
          if (!data.recipientId) {
            return res.status(400).json({
              success: false,
              message: "Merchant ID is required for customer-merchant chat"
            });
          }
          chatRoom = await liveChatService.createCustomerMerchantChat(
            userId,
            data.recipientId,
            data.orderId
          );
          break;

        case 'CUSTOMER_SUPPORT':
          if (!data.issueType) {
            return res.status(400).json({
              success: false,
              message: "Issue type is required for support chat"
            });
          }
          chatRoom = await liveChatService.createSupportChat(
            userId,
            data.issueType,
            data.orderId
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid chat type"
          });
      }

      res.json({
        success: true,
        chatRoom: {
          id: chatRoom.id,
          type: chatRoom.type,
          participants: chatRoom.participants,
          orderId: chatRoom.orderId,
          createdAt: chatRoom.createdAt
        }
      });

    } catch (error: any) {
      console.error('Start chat error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to start chat"
      });
    }
  });

  // Send a message in a chat room
  app.post("/api/chat/send", requireAuth, async (req, res) => {
    try {
      const data = sendMessageSchema.parse(req.body);
      const userId = req.session!.userId!;

      // Validate that user is participant in the chat room
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === data.roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      // The actual message sending is handled by WebSocket
      // This endpoint is for HTTP fallback or initial message creation
      res.json({
        success: true,
        message: "Message queued for sending",
        roomId: data.roomId,
        timestamp: Date.now()
      });

    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to send message"
      });
    }
  });

  // Get chat history for a room
  app.get("/api/chat/history/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const queryParams = getChatHistorySchema.parse(req.query);
      const userId = req.session!.userId!;

      // Validate access to chat room
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      // Get messages from database
      const messages = await storage.getConversationMessages(
        roomId,
        queryParams.limit,
        queryParams.offset
      );

      res.json({
        success: true,
        messages,
        hasMore: messages.length === queryParams.limit
      });

    } catch (error: any) {
      console.error('Chat history error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get chat history"
      });
    }
  });

  // Get user's active chat rooms
  app.get("/api/chat/rooms", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const chatRooms = await liveChatService.getUserChatRooms(userId);

      // Enrich rooms with additional info
      const enrichedRooms = await Promise.all(
        chatRooms.map(async (room) => {
          // Get other participants' info
          const otherParticipants = room.participants.filter(id => id !== userId);
          const participantsInfo = await Promise.all(
            otherParticipants.map(async (participantId) => {
              const user = await storage.getUser(participantId);
              return user ? {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role
              } : null;
            })
          );

          // Calculate unread messages count
          const unreadCount = await calculateUnreadCount(room.id, userId);
          
          return {
            ...room,
            participantsInfo: participantsInfo.filter(Boolean),
            unreadCount
          };
        })
      );

      res.json({
        success: true,
        chatRooms: enrichedRooms
      });

    } catch (error: any) {
      console.error('Get chat rooms error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get chat rooms"
      });
    }
  });

  // Close a chat room
  app.delete("/api/chat/room/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.session!.userId!;

      // Validate access
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      await liveChatService.closeChatRoom(roomId);

      res.json({
        success: true,
        message: "Chat room closed successfully"
      });

    } catch (error: any) {
      console.error('Close chat room error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to close chat room"
      });
    }
  });

  // Get chat statistics for admin
  app.get("/api/chat/admin/stats", requireAuth, async (req, res) => {
    try {
      // This would need admin authorization middleware
      const userId = req.session!.userId!;

      // For now, we'll return mock stats
      // In production, implement proper admin stats
      const stats = {
        activeChatRooms: 0,
        totalMessages: 0,
        supportTickets: 0,
        averageResponseTime: 0
      };

      res.json({
        success: true,
        stats
      });

    } catch (error: any) {
      console.error('Chat stats error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get chat statistics"
      });
    }
  });

  // Role-based message features
  app.post("/api/chat/send-location", requireAuth, async (req, res) => {
    try {
      const { roomId, latitude, longitude, address } = req.body;
      const userId = req.session!.userId!;

      // Validate that user is driver in this chat room
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      // Broadcast location via WebSocket
      if ((global as any).io) {
        (global as any).io.to(roomId).emit('location_shared', {
          chatId: roomId,
          senderId: userId,
          latitude,
          longitude,
          address,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Location shared successfully"
      });

    } catch (error: any) {
      console.error('Share location error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to share location"
      });
    }
  });

  // Merchant order updates in chat
  app.post("/api/chat/send-order-update", requireAuth, async (req, res) => {
    try {
      const { roomId, orderId, status, message } = req.body;
      const userId = req.session!.userId!;

      // Validate access and role
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      // Broadcast order update via WebSocket
      if ((global as any).io) {
        (global as any).io.to(roomId).emit('order_update', {
          chatId: roomId,
          senderId: userId,
          orderId,
          status,
          message,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Order update sent successfully"
      });

    } catch (error: any) {
      console.error('Send order update error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to send order update"
      });
    }
  });

  // Escalate chat to support
  app.post("/api/chat/escalate/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { reason, priority } = req.body;
      const userId = req.session!.userId!;

      // Validate access
      const userRooms = await liveChatService.getUserChatRooms(userId);
      const room = userRooms.find(r => r.id === roomId);

      if (!room) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat room"
        });
      }

      // Create support ticket
      const supportTicket = await storage.createSupportTicket({
        userEmail: `user${userId}@brillprime.com`,
        userRole: 'CONSUMER',
        subject: `Chat Escalation - ${reason}`,
        description: `Chat room ${roomId} escalated to support. Reason: ${reason}`,
        priority: 'MEDIUM'
      });

      // Notify support team via WebSocket
      if ((global as any).io) {
        (global as any).io.to('support_team').emit('chat_escalated', {
          ticketId: supportTicket.id,
          roomId,
          reason,
          priority,
          userId,
          orderId: room.orderId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: "Chat escalated to support successfully",
        ticketId: supportTicket.id
      });

    } catch (error: any) {
      console.error('Chat escalation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to escalate chat"
      });
    }
  });

  // Quick responses for common scenarios
  app.get("/api/chat/quick-responses", requireAuth, async (req, res) => {
    try {
      const { type } = req.query;

      const quickResponses = {
        CUSTOMER_DRIVER: [
          "I'm on my way to pick up your order.",
          "I've arrived at the pickup location.",
          "Your order is being delivered now.",
          "I'll be there in 5 minutes.",
          "Order delivered successfully!"
        ],
        CUSTOMER_MERCHANT: [
          "Your order is being prepared.",
          "Order is ready for pickup.",
          "Thank you for your order!",
          "We'll have it ready in 15 minutes.",
          "Is there anything else we can help you with?"
        ],
        CUSTOMER_SUPPORT: [
          "I'm here to help you with your issue.",
          "Let me look into this for you.",
          "Can you provide more details?",
          "This has been escalated to our team.",
          "Your issue has been resolved."
        ]
      };

      res.json({
        success: true,
        quickResponses: quickResponses[type as keyof typeof quickResponses] || []
      });

    } catch (error: any) {
      console.error('Quick responses error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get quick responses"
      });
    }
  });
}

// Helper function to calculate unread messages count
async function calculateUnreadCount(roomId: string, userId: number): Promise<number> {
  try {
    // Get conversation ID from room ID (assuming room ID maps to conversation ID)
    const conversationId = parseInt(roomId);
    
    // Count messages in this conversation that the user hasn't read
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.isDeleted, false),
        // Message not read by this user (userId not in readBy array)
        sql`NOT (${chatMessages.readBy} ? ${userId.toString()})`
      ));
    
    return result?.count || 0;
  } catch (error) {
    console.error('Calculate unread count error:', error);
    return 0;
  }
}