import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { Server as SocketIOServer } from "socket.io";

export class LiveSystemService {
  private static io: SocketIOServer;

  static setSocketIOInstance(io: SocketIOServer) {
    this.io = io;
  }

  // WebSocket Connection Management (simplified)
  static async registerConnection(userId: number, socketId: string) {
    try {
      console.log(`Registering connection for user ${userId}, socket ${socketId}`);
      return { success: true, userId, socketId };
    } catch (error) {
      console.error('Error registering websocket connection:', error);
      return { success: false, error: 'Failed to register connection' };
    }
  }

  static async updateConnectionActivity(socketId: string) {
    try {
      await db
        .update(websocketConnections)
        .set({ lastActivity: new Date() })
        .where(eq(websocketConnections.socketId, socketId));

      return { success: true };
    } catch (error) {
      console.error('Error updating connection activity:', error);
      return { success: false, error: 'Failed to update activity' };
    }
  }

  static async disconnectConnection(socketId: string) {
    try {
      await db
        .update(websocketConnections)
        .set({ 
          isOnline: false, 
          disconnectedAt: new Date() 
        })
        .where(eq(websocketConnections.socketId, socketId));

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting connection:', error);
      return { success: false, error: 'Failed to disconnect' };
    }
  }

  // Live Notifications
  static async createNotification(notificationData: Omit<InsertLiveNotification, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const [notification] = await db.insert(liveNotifications).values({
        ...notificationData,
      }).returning();

      // Send real-time notification if user is connected
      await this.broadcastToUser(notification.userId, 'notification', notification);

      // Send via other channels if specified
      if (notification.channels.includes('EMAIL')) {
        // TODO: Integrate with email service
      }

      if (notification.channels.includes('SMS')) {
        // TODO: Integrate with SMS service
      }

      if (notification.channels.includes('PUSH')) {
        // TODO: Integrate with push notification service
      }

      return { success: true, notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  static async getUserNotifications(userId: number, limit: number = 50, unreadOnly: boolean = false) {
    try {
      const conditions = [eq(liveNotifications.userId, userId)];
      if (unreadOnly) {
        conditions.push(eq(liveNotifications.isRead, false));
      }

      const notifications = await db
        .select()
        .from(liveNotifications)
        .where(and(...conditions))
        .orderBy(desc(liveNotifications.createdAt))
        .limit(limit);

      return { success: true, notifications };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  static async markNotificationAsRead(notificationId: string, userId: number) {
    try {
      await db
        .update(liveNotifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(liveNotifications.id, notificationId),
          eq(liveNotifications.userId, userId)
        ));

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark as read' };
    }
  }

  // Location Tracking
  static async updateLocation(locationData: Omit<InsertLocationTracking, 'id' | 'createdAt'>) {
    try {
      const [location] = await db.insert(locationTracking).values({
        ...locationData,
      }).returning();

      // Broadcast location update to relevant parties
      await this.broadcastLocationUpdate(location);

      return { success: true, location };
    } catch (error) {
      console.error('Error updating location:', error);
      return { success: false, error: 'Failed to update location' };
    }
  }

  static async getActiveDriversNearLocation(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10
  ) {
    try {
      // This is a simplified implementation - in production, you'd use PostGIS for proper geospatial queries
      const recentLocations = await db
        .select({
          userId: locationTracking.userId,
          latitude: locationTracking.latitude,
          longitude: locationTracking.longitude,
          userRole: locationTracking.userRole,
          timestamp: locationTracking.timestamp,
          fullName: users.fullName,
          phone: users.phone,
        })
        .from(locationTracking)
        .leftJoin(users, eq(locationTracking.userId, users.id))
        .where(and(
          eq(locationTracking.userRole, 'DRIVER'),
          eq(locationTracking.isActive, true),
          gte(locationTracking.timestamp, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        ))
        .orderBy(desc(locationTracking.timestamp));

      // Filter by distance (simplified calculation)
      const nearbyDrivers = recentLocations.filter(location => {
        const distance = this.calculateDistance(
          latitude, longitude,
          parseFloat(location.latitude as string),
          parseFloat(location.longitude as string)
        );
        return distance <= radiusKm;
      });

      return { success: true, drivers: nearbyDrivers };
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      return { success: false, error: 'Failed to fetch drivers' };
    }
  }

  // Real-time Broadcasting
  static async broadcastToUser(userId: number, event: string, data: any) {
    if (!this.io) return;

    try {
      // Get user's active connections
      const connections = await db
        .select()
        .from(websocketConnections)
        .where(and(
          eq(websocketConnections.userId, userId),
          eq(websocketConnections.isOnline, true)
        ));

      // Emit to all user's active connections
      connections.forEach(connection => {
        this.io.to(connection.socketId).emit(event, data);
      });

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting to user:', error);
      return { success: false, error: 'Failed to broadcast' };
    }
  }

  static async broadcastToRole(role: string, event: string, data: any) {
    if (!this.io) return;

    try {
      // Get all connections for users with this role
      const connections = await db
        .select()
        .from(websocketConnections)
        .where(and(
          eq(websocketConnections.userRole, role as any),
          eq(websocketConnections.isOnline, true)
        ));

      // Emit to all connections
      connections.forEach(connection => {
        this.io.to(connection.socketId).emit(event, data);
      });

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting to role:', error);
      return { success: false, error: 'Failed to broadcast' };
    }
  }

  static async broadcastLocationUpdate(location: any) {
    if (!this.io) return;

    try {
      const data = {
        userId: location.userId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        trackingType: location.trackingType,
      };

      // Broadcast based on sharing level and context
      switch (location.sharingLevel) {
        case 'PUBLIC':
          this.io.emit('location_update', data);
          break;

        case 'CUSTOMERS_ONLY':
          if (location.relatedOrderId) {
            // TODO: Get customers associated with this order and broadcast to them
          }
          break;

        case 'MERCHANTS_ONLY':
          await this.broadcastToRole('MERCHANT', 'location_update', data);
          break;

        default:
          // Private - don't broadcast
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting location update:', error);
      return { success: false, error: 'Failed to broadcast location' };
    }
  }

  // Order Status Broadcasting
  static async broadcastOrderUpdate(orderId: string, status: string, updates: any = {}) {
    if (!this.io) return;

    try {
      // TODO: Get order details and all related parties (customer, merchant, driver)
      const orderData = {
        orderId,
        status,
        updates,
        timestamp: new Date(),
      };

      // Broadcast to order room
      this.io.to(`order_${orderId}`).emit('order_status_update', orderData);

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting order update:', error);
      return { success: false, error: 'Failed to broadcast order update' };
    }
  }

  // Utility functions
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // System Health and Metrics
  static async getSystemMetrics() {
    try {
      const activeConnections = await db
        .select()
        .from(websocketConnections)
        .where(and(
          eq(websocketConnections.isOnline, true),
          gte(websocketConnections.lastActivity, new Date(Date.now() - 5 * 60 * 1000))
        ));

      const metrics = {
        activeConnections: activeConnections.length,
        connectionsByRole: activeConnections.reduce((acc, conn) => {
          acc[conn.userRole] = (acc[conn.userRole] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        connectionsByType: activeConnections.reduce((acc, conn) => {
          acc[conn.connectionType] = (acc[conn.connectionType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return { success: true, metrics };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return { success: false, error: 'Failed to get metrics' };
    }
  }
}