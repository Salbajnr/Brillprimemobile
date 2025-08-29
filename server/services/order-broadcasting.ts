import { storage } from '../storage';
import type { Server } from 'socket.io';

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  previousStatus?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  estimatedTime?: {
    preparation?: number; // minutes
    pickup?: number;
    delivery?: number;
  };
  notes?: string;
  updatedBy: number;
  timestamp: number;
}

export interface KitchenUpdate {
  orderId: string;
  kitchenStatus: 'received' | 'preparing' | 'ready_for_pickup' | 'completed';
  preparationTime?: number; // estimated minutes
  actualPreparationTime?: number; // actual minutes taken
  items?: Array<{
    productId: string;
    status: 'pending' | 'preparing' | 'ready';
    estimatedTime?: number;
  }>;
  notes?: string;
  timestamp: number;
}

class OrderBroadcastingService {
  private io: Server | null = null;

  setSocketServer(io: Server) {
    this.io = io;
  }

  /**
   * Broadcast order status update to all relevant parties
   */
  async broadcastOrderStatus(update: OrderStatusUpdate) {
    if (!this.io) return;

    try {
      // Get order details to identify all parties
      const orderDetails = await storage.getOrderTracking(update.orderId);
      if (!orderDetails) return;

      const { buyerId, sellerId, driverId } = orderDetails;

      // Prepare broadcast data
      const broadcastData = {
        type: 'order_status_update',
        orderId: update.orderId,
        status: update.status,
        previousStatus: update.previousStatus,
        location: update.location,
        estimatedTime: update.estimatedTime,
        notes: update.notes,
        timestamp: update.timestamp,
        updatedBy: update.updatedBy
      };

      // Broadcast to all parties
      const recipients = [buyerId, sellerId, driverId].filter(Boolean);

      recipients.forEach(userId => {
        this.io!.to(`user_${userId}`).emit('order_status_update', broadcastData);
      });

      // Broadcast to order-specific room
      this.io.to(`order_${update.orderId}`).emit('order_status_update', broadcastData);

      // Broadcast to admin monitoring
      this.io.to('admin_orders').emit('order_status_update', {
        ...broadcastData,
        orderDetails: {
          buyerId,
          sellerId,
          driverId,
          totalAmount: orderDetails.totalAmount,
          deliveryAddress: orderDetails.deliveryAddress
        }
      });

      // Send role-specific notifications
      await this.sendRoleSpecificNotifications(update, { buyerId, sellerId, driverId });

    } catch (error) {
      console.error('Order broadcasting error:', error);
    }
  }

  /**
   * Broadcast kitchen/preparation updates
   */
  async broadcastKitchenUpdate(update: KitchenUpdate) {
    if (!this.io) return;

    try {
      const orderDetails = await storage.getOrderTracking(update.orderId);
      if (!orderDetails) return;

      const { buyerId, sellerId, driverId } = orderDetails;

      const broadcastData = {
        type: 'kitchen_update',
        orderId: update.orderId,
        kitchenStatus: update.kitchenStatus,
        preparationTime: update.preparationTime,
        actualPreparationTime: update.actualPreparationTime,
        items: update.items,
        notes: update.notes,
        timestamp: update.timestamp
      };

      // Notify customer about preparation progress
      if (buyerId) {
        this.io.to(`user_${buyerId}`).emit('kitchen_update', broadcastData);
      }

      // Notify merchant (kitchen staff)
      if (sellerId) {
        this.io.to(`user_${sellerId}`).emit('kitchen_update', broadcastData);
      }

      // Notify driver if order is ready for pickup
      if (driverId && update.kitchenStatus === 'ready_for_pickup') {
        this.io.to(`user_${driverId}`).emit('order_ready_for_pickup', {
          orderId: update.orderId,
          pickupAddress: orderDetails.pickupAddress,
          merchantContact: orderDetails.merchantContact,
          estimatedReadyTime: Date.now(),
          timestamp: update.timestamp
        });
      }

      // Update order room
      this.io.to(`order_${update.orderId}`).emit('kitchen_update', broadcastData);

    } catch (error) {
      console.error('Kitchen update broadcasting error:', error);
    }
  }

  /**
   * Send pickup confirmation broadcast
   */
  async broadcastPickupConfirmation(orderId: string, driverId: number, pickupDetails: {
    location: { latitude: number; longitude: number };
    timestamp: number;
    photoProof?: string;
    notes?: string;
  }) {
    if (!this.io) return;

    try {
      const orderDetails = await storage.getOrderTracking(orderId);
      if (!orderDetails) return;

      const broadcastData = {
        type: 'pickup_confirmation',
        orderId,
        driverId,
        pickupLocation: pickupDetails.location,
        pickupTime: pickupDetails.timestamp,
        photoProof: pickupDetails.photoProof,
        notes: pickupDetails.notes,
        estimatedDeliveryTime: Date.now() + (30 * 60 * 1000) // 30 minutes estimate
      };

      // Notify customer
      if (orderDetails.buyerId) {
        this.io.to(`user_${orderDetails.buyerId}`).emit('order_picked_up', broadcastData);
      }

      // Notify merchant
      if (orderDetails.sellerId) {
        this.io.to(`user_${orderDetails.sellerId}`).emit('order_picked_up', broadcastData);
      }

      // Update order room
      this.io.to(`order_${orderId}`).emit('pickup_confirmation', broadcastData);

      // Start delivery tracking
      await this.startDeliveryTracking(orderId, driverId);

    } catch (error) {
      console.error('Pickup confirmation broadcasting error:', error);
    }
  }

  /**
   * Send delivery confirmation broadcast
   */
  async broadcastDeliveryConfirmation(orderId: string, deliveryDetails: {
    location: { latitude: number; longitude: number };
    timestamp: number;
    photoProof?: string;
    signature?: string;
    qrCode?: string;
    customerFeedback?: string;
    notes?: string;
  }) {
    if (!this.io) return;

    try {
      const orderDetails = await storage.getOrderTracking(orderId);
      if (!orderDetails) return;

      const broadcastData = {
        type: 'delivery_confirmation',
        orderId,
        deliveryLocation: deliveryDetails.location,
        deliveryTime: deliveryDetails.timestamp,
        photoProof: deliveryDetails.photoProof,
        signature: deliveryDetails.signature,
        qrCode: deliveryDetails.qrCode,
        customerFeedback: deliveryDetails.customerFeedback,
        notes: deliveryDetails.notes,
        orderCompleted: true
      };

      // Notify all parties
      const recipients = [orderDetails.buyerId, orderDetails.sellerId, orderDetails.driverId].filter(Boolean);

      recipients.forEach(userId => {
        this.io!.to(`user_${userId}`).emit('order_delivered', broadcastData);
      });

      // Update order room
      this.io.to(`order_${orderId}`).emit('delivery_confirmation', broadcastData);

      // Trigger post-delivery processes
      await this.triggerPostDeliveryProcesses(orderId, deliveryDetails);

    } catch (error) {
      console.error('Delivery confirmation broadcasting error:', error);
    }
  }

  /**
   * Send role-specific notifications
   */
  private async sendRoleSpecificNotifications(
    update: OrderStatusUpdate,
    parties: { buyerId?: number; sellerId?: number; driverId?: number }
  ) {
    if (!this.io) return;

    const { buyerId, sellerId, driverId } = parties;

    // Customer notifications
    if (buyerId) {
      const customerMessage = this.getCustomerMessage(update.status, update.estimatedTime);
      this.io.to(`user_${buyerId}`).emit('notification', {
        type: 'order_update',
        title: 'Order Update',
        message: customerMessage,
        orderId: update.orderId,
        action: this.getCustomerAction(update.status)
      });
    }

    // Merchant notifications
    if (sellerId) {
      const merchantMessage = this.getMerchantMessage(update.status);
      this.io.to(`user_${sellerId}`).emit('notification', {
        type: 'order_update',
        title: 'Order Update',
        message: merchantMessage,
        orderId: update.orderId,
        action: this.getMerchantAction(update.status)
      });
    }

    // Driver notifications
    if (driverId) {
      const driverMessage = this.getDriverMessage(update.status, update.location);
      this.io.to(`user_${driverId}`).emit('notification', {
        type: 'delivery_update',
        title: 'Delivery Update',
        message: driverMessage,
        orderId: update.orderId,
        action: this.getDriverAction(update.status)
      });
    }
  }

  /**
   * Start delivery tracking for real-time location updates
   */
  private async startDeliveryTracking(orderId: string, driverId: number) {
    if (!this.io) return;

    // Start location tracking interval for this delivery
    const trackingInterval = setInterval(async () => {
      try {
        const driverProfile = await storage.getDriverProfile(driverId);
        if (driverProfile && driverProfile.currentLocation) {
          this.io!.to(`order_${orderId}`).emit('driver_location_update', {
            orderId,
            driverId,
            location: driverProfile.currentLocation,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Location tracking error:', error);
      }
    }, 30000); // Update every 30 seconds

    // Store interval reference (you'd want to clean this up when delivery is complete)
    // This is a simplified implementation - in production, use a proper job queue
    setTimeout(() => {
      clearInterval(trackingInterval);
    }, 2 * 60 * 60 * 1000); // Stop after 2 hours max
  }

  /**
   * Trigger post-delivery processes
   */
  private async triggerPostDeliveryProcesses(orderId: string, deliveryDetails: any) {
    // Trigger rating request
    setTimeout(() => {
      if (this.io) {
        this.io.to(`order_${orderId}`).emit('rating_request', {
          orderId,
          deliveryTime: deliveryDetails.timestamp
        });
      }
    }, 5 * 60 * 1000); // 5 minutes after delivery

    // Update order analytics
    // This would integrate with your analytics service
  }

  // Helper methods for generating role-specific messages
  private getCustomerMessage(status: string, estimatedTime?: any): string {
    switch (status) {
      case 'confirmed': return 'Your order has been confirmed and is being prepared.';
      case 'preparing': return `Your order is being prepared. ${estimatedTime?.preparation ? `Estimated time: ${estimatedTime.preparation} minutes.` : ''}`;
      case 'ready_for_pickup': return 'Your order is ready and waiting for pickup.';
      case 'picked_up': return 'Your order has been picked up and is on the way.';
      case 'delivered': return 'Your order has been delivered successfully!';
      default: return `Your order status has been updated to ${status}.`;
    }
  }

  private getMerchantMessage(status: string): string {
    switch (status) {
      case 'confirmed': return 'New order received. Please start preparation.';
      case 'picked_up': return 'Order has been picked up by the driver.';
      case 'delivered': return 'Order has been delivered successfully.';
      default: return `Order status updated to ${status}.`;
    }
  }

  private getDriverMessage(status: string, location?: any): string {
    switch (status) {
      case 'ready_for_pickup': return 'Order is ready for pickup. Please proceed to merchant location.';
      case 'assigned': return 'New delivery assigned to you. Please review details.';
      default: return `Delivery status updated to ${status}.`;
    }
  }

  private getCustomerAction(status: string): string {
    switch (status) {
      case 'delivered': return 'RATE_ORDER';
      case 'picked_up': return 'TRACK_ORDER';
      default: return 'VIEW_ORDER';
    }
  }

  private getMerchantAction(status: string): string {
    switch (status) {
      case 'confirmed': return 'START_PREPARATION';
      case 'delivered': return 'VIEW_ANALYTICS';
      default: return 'VIEW_ORDER';
    }
  }

  private getDriverAction(status: string): string {
    switch (status) {
      case 'ready_for_pickup': return 'NAVIGATE_TO_PICKUP';
      case 'assigned': return 'ACCEPT_DELIVERY';
      default: return 'VIEW_DELIVERY';
    }
  }
}

interface OrderUpdateData {
  orderId: string;
  buyerId: number;
  sellerId?: number | null;
  driverId?: number | null;
  status: string;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  estimatedDeliveryTime?: string;
  message?: string;
}

const orderBroadcastingService = {
  broadcastOrderUpdate: (orderData: OrderUpdateData) => {
    if (global.io) {
      const updatePayload = {
        type: 'ORDER_UPDATE',
        orderId: orderData.orderId,
        status: orderData.status,
        location: orderData.location,
        estimatedDeliveryTime: orderData.estimatedDeliveryTime,
        message: orderData.message || `Order status updated to ${orderData.status}`,
        timestamp: Date.now()
      };

      // Broadcast to customer
      global.io.to(`user_${orderData.buyerId}`).emit('order_update', updatePayload);

      // Broadcast to merchant if exists
      if (orderData.sellerId) {
        global.io.to(`user_${orderData.sellerId}`).emit('order_update', updatePayload);
      }

      // Broadcast to driver if assigned
      if (orderData.driverId) {
        global.io.to(`user_${orderData.driverId}`).emit('order_update', updatePayload);
      }

      // Broadcast to order-specific room
      global.io.to(`order_${orderData.orderId}`).emit('order_update', updatePayload);

      // Broadcast to admin monitoring
      global.io.to('admin_orders').emit('order_update', {
        ...updatePayload,
        buyerId: orderData.buyerId,
        sellerId: orderData.sellerId,
        driverId: orderData.driverId
      });
    }
  },

  broadcastLocationUpdate: (orderData: { orderId: string; driverId: number; location: any; eta?: string }) => {
    if (global.io) {
      const locationPayload = {
        type: 'LOCATION_UPDATE',
        orderId: orderData.orderId,
        driverId: orderData.driverId,
        location: orderData.location,
        eta: orderData.eta,
        timestamp: Date.now()
      };

      // Broadcast to order tracking room
      global.io.to(`order_${orderData.orderId}`).emit('driver_location_update', locationPayload);

      // Broadcast to driver room
      global.io.to(`driver_${orderData.driverId}`).emit('location_update_ack', locationPayload);
    }
  }
};

// Export the service instance and convenience functions
export { orderBroadcastingService };

// Export convenience function for backward compatibility
export const broadcastOrderUpdate = (orderId: string, update: Partial<OrderStatusUpdate>) => {
  return orderBroadcastingService.broadcastOrderUpdate({
    orderId,
    status: update.status || 'PENDING',
    previousStatus: update.previousStatus,
    location: update.location,
    estimatedTime: update.estimatedTime,
    notes: update.notes,
    updatedBy: update.updatedBy || 0,
    timestamp: update.timestamp || Date.now()
  });
};