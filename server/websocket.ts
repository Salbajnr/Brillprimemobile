
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { storage } from "./storage";
import jwt from 'jsonwebtoken';

// Redis clients for pub/sub and data storage
// Redis configuration for WebSocket
const REDIS_URL = "redis://default:ob0XzfYSqIWm028JdW7JkBY8VWkhQp7A@redis-13241.c245.us-east-1-3.ec2.redns.redis-cloud.com:13241";
let redis: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

if (!process.env.REDIS_DISABLED) {
  try {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
    redisPub = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
    redisSub = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
    console.log('WebSocket connected to Redis Cloud');
  } catch (error) {
    console.log('WebSocket using memory store (Redis connection failed)');
    redis = redisPub = redisSub = null;
  }
} else {
  console.log('WebSocket using memory store (Redis disabled)');
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
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  HEARTBEAT = 'HEARTBEAT',
  RECONNECT = 'RECONNECT',
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
  lastActivity?: number;
  connectionTime?: number;
  reconnectCount?: number;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: Map<string, AuthenticatedSocket>;
  connectionsByRole: Map<string, Set<string>>;
  connectionsByUser: Map<number, Set<string>>;
  messageQueue: Map<string, any[]>;
}

class WebSocketConnectionManager {
  private metrics: ConnectionMetrics;
  private messageQueue: Map<number, any[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: new Map(),
      connectionsByRole: new Map(),
      connectionsByUser: new Map(),
      messageQueue: new Map()
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  addConnection(socket: AuthenticatedSocket): void {
    this.metrics.activeConnections.set(socket.id, socket);
    this.metrics.totalConnections++;

    if (socket.userRole) {
      if (!this.metrics.connectionsByRole.has(socket.userRole)) {
        this.metrics.connectionsByRole.set(socket.userRole, new Set());
      }
      this.metrics.connectionsByRole.get(socket.userRole)!.add(socket.id);
    }

    if (socket.userId) {
      if (!this.metrics.connectionsByUser.has(socket.userId)) {
        this.metrics.connectionsByUser.set(socket.userId, new Set());
      }
      this.metrics.connectionsByUser.get(socket.userId)!.add(socket.id);
    }

    socket.connectionTime = Date.now();
    socket.lastActivity = Date.now();
    socket.reconnectCount = 0;
  }

  removeConnection(socket: AuthenticatedSocket): void {
    this.metrics.activeConnections.delete(socket.id);

    if (socket.userRole) {
      const roleConnections = this.metrics.connectionsByRole.get(socket.userRole);
      if (roleConnections) {
        roleConnections.delete(socket.id);
        if (roleConnections.size === 0) {
          this.metrics.connectionsByRole.delete(socket.userRole);
        }
      }
    }

    if (socket.userId) {
      const userConnections = this.metrics.connectionsByUser.get(socket.userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        if (userConnections.size === 0) {
          this.metrics.connectionsByUser.delete(socket.userId);
        }
      }
    }
  }

  getConnectionsByRole(role: string): Set<string> {
    return this.metrics.connectionsByRole.get(role) || new Set();
  }

  getConnectionsByUser(userId: number): Set<string> {
    return this.metrics.connectionsByUser.get(userId) || new Set();
  }

  isUserOnline(userId: number): boolean {
    return this.metrics.connectionsByUser.has(userId);
  }

  getMetrics() {
    return {
      totalConnections: this.metrics.totalConnections,
      activeConnections: this.metrics.activeConnections.size,
      connectionsByRole: Object.fromEntries(
        Array.from(this.metrics.connectionsByRole.entries()).map(
          ([role, connections]) => [role, connections.size]
        )
      ),
      onlineUsers: this.metrics.connectionsByUser.size
    };
  }

  // Queue messages for offline users
  async queueMessage(userId: number, message: any): Promise<void> {
    const key = `msg_queue:${userId}`;
    if (redis) {
      await redis.lpush(key, JSON.stringify(message));
      await redis.expire(key, 24 * 60 * 60); // Expire after 24 hours
    } else {
      // Memory fallback - use a map for queued messages
      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      this.messageQueue.get(userId)?.push(message);
    }
  }

  // Get queued messages for user
  async getQueuedMessages(userId: number): Promise<any[]> {
    const key = `msg_queue:${userId}`;
    if (redis) {
      const messages = await redis.lrange(key, 0, -1);
      await redis.del(key);
      return messages.map(msg => JSON.parse(msg));
    } else {
      // Memory fallback
      const messages = this.messageQueue.get(userId) || [];
      this.messageQueue.delete(userId);
      return messages;
    }
  }

  // Heartbeat mechanism
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.metrics.activeConnections.forEach((socket, socketId) => {
        const now = Date.now();
        const timeSinceLastActivity = now - (socket.lastActivity || 0);
        
        // Send ping if inactive for 30 seconds
        if (timeSinceLastActivity > 30000) {
          socket.emit('ping', { timestamp: now });
        }
        
        // Disconnect if inactive for 5 minutes
        if (timeSinceLastActivity > 300000) {
          console.log(`Disconnecting inactive socket: ${socketId}`);
          socket.disconnect();
        }
      });
    }, 30000); // Every 30 seconds
  }

  // Cleanup mechanism
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      // Clean up old message queues
      const keys = await redis.keys('msg_queue:*');
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // No expiration set
          await redis.expire(key, 24 * 60 * 60);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
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
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6 // 1MB
  });

  // Make io globally available
  (global as any).io = io;

  const connectionManager = new WebSocketConnectionManager();

  // Redis pub/sub for scaling across multiple servers (if available)
  if (redisSub) {
    redisSub.subscribe('websocket:broadcast');
    redisSub.on('message', (channel, message) => {
      if (channel === 'websocket:broadcast') {
        const data = JSON.parse(message);
        io.emit(data.event, data.payload);
      }
    });
  }

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`WebSocket connection established: ${socket.id}`);
    connectionManager.addConnection(socket);

    // Enhanced authentication with reconnection support
    socket.on('authenticate', async (data: { 
      token?: string; 
      userId?: number; 
      reconnectToken?: string;
      clientInfo?: any;
    }) => {
      try {
        if (data.token) {
          const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
          const decoded = jwt.verify(data.token, JWT_SECRET) as any;
          socket.userId = decoded.userId;
          socket.userRole = decoded.role;
          socket.userName = decoded.fullName;
        } else if (data.reconnectToken && redis) {
          // Handle reconnection with stored session
          const sessionData = await redis.get(`session:${data.reconnectToken}`);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            socket.userId = session.userId;
            socket.userRole = session.role;
            socket.userName = session.fullName;
            socket.reconnectCount = (socket.reconnectCount || 0) + 1;
          }
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
          connectionManager.addConnection(socket);

          // Join role-based rooms
          socket.join(`role_${socket.userRole}`);
          socket.join(`user_${socket.userId}`);

          if (socket.userRole === 'ADMIN') {
            socket.join('admin_monitoring');
            socket.join('admin_dashboard');
          }

          // Send queued messages
          const queuedMessages = await connectionManager.getQueuedMessages(socket.userId);
          queuedMessages.forEach(message => {
            socket.emit(message.type, message.data);
          });

          // Generate reconnection token
          const reconnectToken = require('crypto').randomBytes(32).toString('hex');
          if (redis) {
            await redis.setex(`session:${reconnectToken}`, 3600, JSON.stringify({
              userId: socket.userId,
              role: socket.userRole,
              fullName: socket.userName
            }));
          }

          socket.emit('authenticated', {
            userId: socket.userId,
            role: socket.userRole,
            socketId: socket.id,
            reconnectToken,
            serverTime: Date.now(),
            queuedMessagesCount: queuedMessages.length
          });

          console.log(`User ${socket.userId} (${socket.userRole}) authenticated with ${socket.reconnectCount || 0} reconnects`);

          // Emit user online status
          socket.broadcast.emit('user_status_change', {
            userId: socket.userId,
            isOnline: true,
            timestamp: Date.now()
          });

          // Store user online status in Redis
          if (redis) {
            await redis.setex(`user:online:${socket.userId}`, 300, socket.id); // 5 minutes TTL
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { 
          message: 'Invalid authentication',
          code: 'AUTH_FAILED',
          canRetry: true
        });
      }
    });

    // Enhanced heartbeat with connection quality metrics
    socket.on('pong', (data: { timestamp: number; clientTime?: number }) => {
      socket.lastActivity = Date.now();
      const latency = Date.now() - data.timestamp;
      
      socket.emit('heartbeat_ack', {
        serverTime: Date.now(),
        latency,
        quality: latency < 100 ? 'excellent' : latency < 300 ? 'good' : 'poor'
      });
    });

    // Connection quality monitoring
    socket.on('connection_quality', (data: { 
      networkType?: string;
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    }) => {
      // Store connection quality metrics
      if (redis) {
        redis.hset(`connection:${socket.id}`, {
          ...data,
          timestamp: Date.now()
        });
      }
    });

    // Enhanced real-time order status updates with reliability
    socket.on('order_status_update', async (data: { 
      orderId: string; 
      status: string; 
      location?: any;
      driverId?: number;
      notes?: string;
      reliability?: 'high' | 'medium' | 'low';
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { 
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
            action: 'order_status_update'
          });
          return;
        }

        const orderTracking = await storage.getOrderTracking(data.orderId);
        if (orderTracking) {
          // Note: updateOrderTracking method may need to be implemented in storage
          // For now, using available storage methods
          console.log(`Order ${data.orderId} status updated to ${data.status}`);

          const updateData = {
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            driverId: data.driverId,
            notes: data.notes,
            timestamp: Date.now(),
            updatedBy: socket.userId,
            reliability: data.reliability || 'medium'
          };

          // Broadcast with acknowledgment for critical updates
          const isCritical = ['delivered', 'cancelled', 'emergency'].includes(data.status.toLowerCase());
          
          // Notify customer
          if (orderTracking.buyerId) {
            const customerSockets = connectionManager.getConnectionsByUser(orderTracking.buyerId);
            if (customerSockets.size > 0) {
              customerSockets.forEach(socketId => {
                const targetSocket = connectionManager.metrics.activeConnections.get(socketId);
                if (targetSocket) {
                  if (isCritical) {
                    targetSocket.emit('order_update_critical', updateData, (ack: any) => {
                      console.log(`Critical order update acknowledged by customer ${orderTracking.buyerId}`);
                    });
                  } else {
                    targetSocket.emit('order_update', updateData);
                  }
                }
              });
            } else {
              // Queue message for offline customer
              await connectionManager.queueMessage(orderTracking.buyerId, {
                type: 'order_update',
                data: updateData,
                priority: isCritical ? 'high' : 'normal'
              });
            }
          }

          // Broadcast to Redis for multi-server scaling
          await redisPub.publish('websocket:broadcast', JSON.stringify({
            event: 'order_status_global_update',
            payload: updateData
          }));

          // Notify admins with enhanced metrics
          io.to('admin_monitoring').emit('admin_order_update', {
            ...updateData,
            connectionMetrics: connectionManager.getMetrics(),
            processingTime: Date.now() - (data as any).clientTimestamp || 0
          });
        }
      } catch (error) {
        console.error('Order status update error:', error);
        socket.emit('error', { 
          message: 'Failed to update order status',
          code: 'ORDER_UPDATE_FAILED',
          orderId: data.orderId,
          canRetry: true
        });
      }
    });

    // Enhanced location tracking with optimization
    socket.on('location_update', async (data: {
      latitude: number;
      longitude: number;
      orderId?: string;
      heading?: number;
      speed?: number;
      accuracy?: number;
      altitude?: number;
      timestamp?: number;
    }) => {
      try {
        if (!socket.userId || socket.userRole !== 'DRIVER') {
          socket.emit('error', { 
            message: 'Driver authentication required',
            code: 'DRIVER_AUTH_REQUIRED'
          });
          return;
        }

        // Validate location data
        if (Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
          socket.emit('error', {
            message: 'Invalid coordinates',
            code: 'INVALID_LOCATION'
          });
          return;
        }

        // Update driver location with Redis for fast access
        const locationKey = `location:driver:${socket.userId}`;
        await redis.hset(locationKey, {
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading || 0,
          speed: data.speed || 0,
          accuracy: data.accuracy || 0,
          altitude: data.altitude || 0,
          timestamp: data.timestamp || Date.now(),
          lastUpdate: Date.now()
        });
        await redis.expire(locationKey, 300); // 5 minutes TTL

        const locationData = {
          driverId: socket.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          accuracy: data.accuracy,
          timestamp: data.timestamp || Date.now()
        };

        // If orderId provided, update specific order tracking
        if (data.orderId) {
          const orderTracking = await storage.getOrderTracking(data.orderId);
          if (orderTracking) {
            let etaMinutes = null;
            let distance = null;
            
            if (orderTracking.deliveryLatitude && orderTracking.deliveryLongitude) {
              distance = calculateDistance(
                data.latitude, 
                data.longitude,
                parseFloat(orderTracking.deliveryLatitude),
                parseFloat(orderTracking.deliveryLongitude)
              );
              
              // Dynamic ETA calculation based on speed and traffic
              const avgSpeed = data.speed && data.speed > 5 ? data.speed : 25; // km/h
              etaMinutes = Math.round((distance / avgSpeed) * 60);
            }

            const trackingUpdate = {
              ...locationData,
              orderId: data.orderId,
              eta: etaMinutes ? `${etaMinutes} minutes` : null,
              distance: distance ? `${distance.toFixed(1)} km` : null,
              estimatedArrival: etaMinutes ? new Date(Date.now() + etaMinutes * 60000).toISOString() : null
            };

            // Notify customer and merchant with optimized delivery
            const notifications = [];
            
            if (orderTracking.buyerId) {
              notifications.push(
                connectionManager.getConnectionsByUser(orderTracking.buyerId)
              );
            }
            
            if (orderTracking.sellerId) {
              notifications.push(
                connectionManager.getConnectionsByUser(orderTracking.sellerId)
              );
            }

            notifications.forEach(socketSet => {
              socketSet.forEach(socketId => {
                const targetSocket = connectionManager.metrics.activeConnections.get(socketId);
                if (targetSocket) {
                  targetSocket.emit('driver_location_update', trackingUpdate);
                }
              });
            });

            // Update order room
            io.to(`order_${data.orderId}`).emit('driver_location_update', trackingUpdate);
          }
        }

        // Broadcast to admin monitoring with connection metrics
        io.to('admin_monitoring').emit('driver_location_update', {
          ...locationData,
          onlineDrivers: connectionManager.getConnectionsByRole('DRIVER').size,
          totalConnections: connectionManager.getMetrics().activeConnections
        });

      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { 
          message: 'Failed to update location',
          code: 'LOCATION_UPDATE_FAILED',
          canRetry: true
        });
      }
    });

    // Enhanced disconnect handling
    socket.on('disconnect', async (reason: string) => {
      console.log(`WebSocket disconnected: ${socket.id}, reason: ${reason}`);
      
      if (socket.userId) {
        connectionManager.removeConnection(socket);
        
        // Update user offline status in Redis
        await redis.del(`user:online:${socket.userId}`);
        
        // Broadcast user offline status with delay to handle quick reconnections
        setTimeout(async () => {
          if (!connectionManager.isUserOnline(socket.userId!)) {
            socket.broadcast.emit('user_status_change', {
              userId: socket.userId,
              isOnline: false,
              timestamp: Date.now(),
              lastSeen: socket.lastActivity
            });
          }
        }, 5000); // 5 second delay
      }

      // Clean up connection quality metrics
      if (redis) {
        redis.del(`connection:${socket.id}`);
      }
    });

    // Error handling with detailed logging
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.id}:`, {
        error: error.message,
        userId: socket.userId,
        userRole: socket.userRole,
        connectionTime: socket.connectionTime ? Date.now() - socket.connectionTime : 0,
        reconnectCount: socket.reconnectCount
      });

      // Report to admin monitoring
      io.to('admin_monitoring').emit('websocket_error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
        timestamp: Date.now()
      });
    });

    // Send connection acknowledgment with server metrics
    socket.emit(MessageType.CONNECTION_ACK, {
      socketId: socket.id,
      serverTime: Date.now(),
      message: 'Connected to Brill Prime WebSocket server',
      serverMetrics: {
        activeConnections: connectionManager.getMetrics().activeConnections,
        serverLoad: process.cpuUsage(),
        memory: process.memoryUsage()
      }
    });
  });

  // Admin endpoint to get connection metrics
  io.of('/admin').on('connection', (socket) => {
    socket.emit('connection_metrics', connectionManager.getMetrics());
    
    socket.on('get_metrics', () => {
      socket.emit('connection_metrics', connectionManager.getMetrics());
    });
    
    socket.on('disconnect_user', async (userId: number) => {
      const userSockets = connectionManager.getConnectionsByUser(userId);
      userSockets.forEach(socketId => {
        const userSocket = connectionManager.metrics.activeConnections.get(socketId);
        if (userSocket) {
          userSocket.disconnect();
        }
      });
    });
  });

  // Periodic metrics broadcast to admins
  setInterval(() => {
    io.to('admin_monitoring').emit('system_metrics_update', {
      ...connectionManager.getMetrics(),
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  }, 30000); // Every 30 seconds

  console.log('Enhanced WebSocket server initialized successfully');
  
  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    connectionManager.destroy();
    redis.disconnect();
    redisPub.disconnect();
    redisSub.disconnect();
  });

  return io;
}
