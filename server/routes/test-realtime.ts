import type { Express } from "express";
import { requireAuth } from "../middleware/auth";
import { orderBroadcastingService } from "../services/order-broadcasting";
import { liveChatService } from "../services/live-chat";

export default function registerTestRealtimeRoutes(app: Express) {
  // Test order status broadcasting
  app.post("/api/test/order-status", requireAuth, async (req, res) => {
    try {
      const { orderId, status, location, notes } = req.body;
      const userId = req.session!.userId!;

      // Test order status update
      await orderBroadcastingService.broadcastOrderStatus({
        orderId: orderId || "TEST_ORDER_123",
        status: status || "preparing",
        location: location || { latitude: 6.5244, longitude: 3.3792, address: "Lagos, Nigeria" },
        estimatedTime: { preparation: 15, delivery: 30 },
        notes: notes || "Test order status update",
        updatedBy: userId,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        message: "Order status broadcast sent successfully",
        orderId: orderId || "TEST_ORDER_123",
        status: status || "preparing"
      });

    } catch (error: any) {
      console.error('Test order status error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to broadcast order status"
      });
    }
  });

  // Test kitchen status update
  app.post("/api/test/kitchen-status", requireAuth, async (req, res) => {
    try {
      const { orderId, kitchenStatus, preparationTime } = req.body;

      await orderBroadcastingService.broadcastKitchenUpdate({
        orderId: orderId || "TEST_ORDER_123",
        kitchenStatus: kitchenStatus || "preparing",
        preparationTime: preparationTime || 15,
        items: [
          { productId: "ITEM_1", status: "preparing", estimatedTime: 10 },
          { productId: "ITEM_2", status: "pending", estimatedTime: 5 }
        ],
        notes: "Test kitchen update",
        timestamp: Date.now()
      });

      res.json({
        success: true,
        message: "Kitchen status broadcast sent successfully",
        orderId: orderId || "TEST_ORDER_123",
        kitchenStatus: kitchenStatus || "preparing"
      });

    } catch (error: any) {
      console.error('Test kitchen status error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to broadcast kitchen status"
      });
    }
  });

  // Test pickup confirmation
  app.post("/api/test/pickup-confirmation", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.body;
      const driverId = req.session!.userId!;

      await orderBroadcastingService.broadcastPickupConfirmation(
        orderId || "TEST_ORDER_123",
        driverId,
        {
          location: { latitude: 6.5244, longitude: 3.3792 },
          timestamp: Date.now(),
          photoProof: "https://example.com/pickup-photo.jpg",
          notes: "Test pickup confirmation"
        }
      );

      res.json({
        success: true,
        message: "Pickup confirmation broadcast sent successfully",
        orderId: orderId || "TEST_ORDER_123",
        driverId
      });

    } catch (error: any) {
      console.error('Test pickup confirmation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to broadcast pickup confirmation"
      });
    }
  });

  // Test delivery confirmation
  app.post("/api/test/delivery-confirmation", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.body;

      await orderBroadcastingService.broadcastDeliveryConfirmation(
        orderId || "TEST_ORDER_123",
        {
          location: { latitude: 6.5244, longitude: 3.3792 },
          timestamp: Date.now(),
          photoProof: "https://example.com/delivery-photo.jpg",
          signature: "customer_signature_base64",
          qrCode: "QR_CODE_SCAN_DATA",
          notes: "Test delivery confirmation"
        }
      );

      res.json({
        success: true,
        message: "Delivery confirmation broadcast sent successfully",
        orderId: orderId || "TEST_ORDER_123"
      });

    } catch (error: any) {
      console.error('Test delivery confirmation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to broadcast delivery confirmation"
      });
    }
  });

  // Test chat room creation
  app.post("/api/test/create-chat", requireAuth, async (req, res) => {
    try {
      const { type, recipientId, orderId } = req.body;
      const userId = req.session!.userId!;

      let chatRoom;

      switch (type) {
        case 'CUSTOMER_DRIVER':
          chatRoom = await liveChatService.createCustomerDriverChat(
            orderId || "TEST_ORDER_123",
            userId,
            recipientId || 999
          );
          break;
        case 'CUSTOMER_MERCHANT':
          chatRoom = await liveChatService.createCustomerMerchantChat(
            userId,
            recipientId || 888,
            orderId
          );
          break;
        case 'SUPPORT':
          chatRoom = await liveChatService.createSupportChat(
            userId,
            "TEST_ISSUE",
            orderId
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
        message: "Test chat room created successfully",
        chatRoom: {
          id: chatRoom.id,
          type: chatRoom.type,
          participants: chatRoom.participants,
          orderId: chatRoom.orderId
        }
      });

    } catch (error: any) {
      console.error('Test chat creation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create test chat room"
      });
    }
  });

  // Test real-time monitoring
  app.get("/api/test/realtime-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const userChatRooms = await liveChatService.getUserChatRooms(userId);

      res.json({
        success: true,
        data: {
          userId,
          activeChatRooms: userChatRooms.length,
          chatRooms: userChatRooms.map(room => ({
            id: room.id,
            type: room.type,
            participants: room.participants.length,
            isActive: room.isActive
          })),
          websocketStatus: (global as any).io ? "connected" : "disconnected",
          broadcastingServices: {
            orderBroadcasting: "active",
            liveChat: "active"
          }
        }
      });

    } catch (error: any) {
      console.error('Test realtime status error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get realtime status"
      });
    }
  });
}

