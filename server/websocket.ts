import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { log } from './vite';

// Define message types for WebSocket communication
export enum MessageType {
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  NOTIFICATION = 'NOTIFICATION',
  DELIVERY_STATUS = 'DELIVERY_STATUS',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  CONNECTION_ACK = 'CONNECTION_ACK',
  ERROR = 'ERROR'
}

// Define client roles
export enum ClientRole {
  CONSUMER = 'CONSUMER',
  MERCHANT = 'MERCHANT',
  DRIVER = 'DRIVER'
}

// Define message structure
export interface WebSocketMessage {
  id?: string;
  type: MessageType;
  senderId: string;
  senderRole: ClientRole;
  recipientId?: string;
  recipientRole?: ClientRole;
  payload: any;
  timestamp: number;
}

// Define client connection structure
interface ClientConnection {
  userId: string;
  role: ClientRole;
  socket: WebSocket;
  lastActivity: number;
}

// WebSocket server class
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private userIdToConnectionId: Map<string, string> = new Map();
  
  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.setupHeartbeat();
    log('WebSocket server initialized');
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket) => {
      // Generate a unique connection ID
      const connectionId = this.generateConnectionId();
      
      // Handle authentication and setup
      socket.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
          
          // Handle authentication message
          if (parsedMessage.type === MessageType.CONNECTION_ACK) {
            const { senderId, senderRole } = parsedMessage;
            
            // Register the client
            this.registerClient(connectionId, senderId, senderRole as ClientRole, socket);
            
            // Send acknowledgment
            this.sendToClient(socket, {
              type: MessageType.CONNECTION_ACK,
              senderId: 'server',
              senderRole: ClientRole.CONSUMER, // Placeholder
              payload: { status: 'connected', userId: senderId },
              timestamp: Date.now()
            });
            
            log(`Client connected: ${senderId} (${senderRole})`);
          } else {
            // Handle other message types
            this.handleMessage(parsedMessage);
          }
        } catch (error) {
          log(`Error parsing message: ${error}`);
          this.sendToClient(socket, {
            type: MessageType.ERROR,
            senderId: 'server',
            senderRole: ClientRole.CONSUMER, // Placeholder
            payload: { error: 'Invalid message format' },
            timestamp: Date.now()
          });
        }
      });

      // Handle disconnection
      socket.on('close', () => {
        const client = this.findClientByConnectionId(connectionId);
        if (client) {
          log(`Client disconnected: ${client.userId} (${client.role})`);
          this.userIdToConnectionId.delete(client.userId);
          this.clients.delete(connectionId);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        log(`WebSocket error: ${error}`);
        const client = this.findClientByConnectionId(connectionId);
        if (client) {
          this.userIdToConnectionId.delete(client.userId);
          this.clients.delete(connectionId);
        }
      });
    });
  }

  private setupHeartbeat() {
    // Ping clients every 30 seconds to keep connections alive
    setInterval(() => {
      this.wss.clients.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      });

      // Clean up inactive connections (inactive for more than 2 minutes)
      const now = Date.now();
      const inactiveTimeout = 2 * 60 * 1000; // 2 minutes
      
      this.clients.forEach((client, connectionId) => {
        if (now - client.lastActivity > inactiveTimeout) {
          log(`Removing inactive client: ${client.userId} (${client.role})`);
          this.userIdToConnectionId.delete(client.userId);
          this.clients.delete(connectionId);
          client.socket.terminate();
        }
      });
    }, 30000);
  }

  private registerClient(connectionId: string, userId: string, role: ClientRole, socket: WebSocket) {
    if (!Object.values(ClientRole).includes(role)) {
      throw new Error(`Invalid client role: ${role}`);
    }
    // If user already has a connection, close the old one
    const existingConnectionId = this.userIdToConnectionId.get(userId);
    if (existingConnectionId) {
      const existingClient = this.clients.get(existingConnectionId);
      if (existingClient) {
        existingClient.socket.close();
        this.clients.delete(existingConnectionId);
      }
    }
    
    // Register the new connection
    this.clients.set(connectionId, {
      userId,
      role,
      socket,
      lastActivity: Date.now()
    });
    
    this.userIdToConnectionId.set(userId, connectionId);
  }

  private findClientByConnectionId(connectionId: string): ClientConnection | undefined {
    return this.clients.get(connectionId);
  }

  private findClientByUserId(userId: string): ClientConnection | undefined {
    const connectionId = this.userIdToConnectionId.get(userId);
    if (connectionId) {
      return this.clients.get(connectionId);
    }
    return undefined;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private sendToClient(socket: WebSocket, message: WebSocketMessage) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        log(`Cannot send message - socket not open for user ${message.recipientId || 'unknown'}`);
      }
    } catch (error) {
      log(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    if (!message || !message.type || !message.senderId || !message.senderRole) {
      log('Invalid message format - missing required fields');
      return;
    }
    // Update last activity for the sender
    const senderClient = this.findClientByUserId(message.senderId);
    if (senderClient) {
      senderClient.lastActivity = Date.now();
    } else {
      log(`Message from unknown client: ${message.senderId}`);
      return;
    }

    // Process message based on type
    switch (message.type) {
      case MessageType.CHAT_MESSAGE:
        this.handleChatMessage(message);
        break;
      case MessageType.LOCATION_UPDATE:
        this.handleLocationUpdate(message);
        break;
      case MessageType.ORDER_STATUS_UPDATE:
        this.handleOrderStatusUpdate(message);
        break;
      case MessageType.NOTIFICATION:
        this.handleNotification(message);
        break;
      case MessageType.DELIVERY_STATUS:
        this.handleDeliveryStatus(message);
        break;
      case MessageType.PAYMENT_CONFIRMATION:
        this.handlePaymentConfirmation(message);
        break;
      default:
        log(`Unknown message type: ${message.type}`);
    }
  }

  private handleChatMessage(message: WebSocketMessage) {
    // If recipient is specified, send only to them
    if (message.recipientId) {
      const recipientClient = this.findClientByUserId(message.recipientId);
      if (recipientClient) {
        this.sendToClient(recipientClient.socket, message);
        log(`Chat message sent to ${message.recipientId}`);
      } else {
        // Store message for offline delivery or notification
        log(`Recipient offline: ${message.recipientId}`);
      }
    }
  }

  private handleLocationUpdate(message: WebSocketMessage) {
    // For driver location updates, notify relevant consumers or merchants
    if (message.senderRole === ClientRole.DRIVER && message.payload.orderId) {
      // In a real implementation, we would look up which users are tracking this order
      // and send them the location update
      log(`Driver location update for order ${message.payload.orderId}`);
    }
  }

  private handleOrderStatusUpdate(message: WebSocketMessage) {
    // Notify relevant parties about order status changes
    if (message.recipientId) {
      const recipientClient = this.findClientByUserId(message.recipientId);
      if (recipientClient) {
        this.sendToClient(recipientClient.socket, message);
        log(`Order status update sent to ${message.recipientId}`);
      }
    }
  }

  private handleNotification(message: WebSocketMessage) {
    // Send notification to specific user
    if (message.recipientId) {
      const recipientClient = this.findClientByUserId(message.recipientId);
      if (recipientClient) {
        this.sendToClient(recipientClient.socket, message);
        log(`Notification sent to ${message.recipientId}`);
      }
    }
  }

  private handleDeliveryStatus(message: WebSocketMessage) {
    // Update delivery status for relevant parties
    if (message.recipientId) {
      const recipientClient = this.findClientByUserId(message.recipientId);
      if (recipientClient) {
        this.sendToClient(recipientClient.socket, message);
        log(`Delivery status update sent to ${message.recipientId}`);
      }
    }
  }

  private handlePaymentConfirmation(message: WebSocketMessage) {
    // Notify about payment confirmation
    if (message.recipientId) {
      const recipientClient = this.findClientByUserId(message.recipientId);
      if (recipientClient) {
        this.sendToClient(recipientClient.socket, message);
        log(`Payment confirmation sent to ${message.recipientId}`);
      }
    }
  }

  // Public methods for sending messages from the server
  public sendNotification(userId: string, payload: any) {
    const client = this.findClientByUserId(userId);
    if (client) {
      this.sendToClient(client.socket, {
        type: MessageType.NOTIFICATION,
        senderId: 'server',
        senderRole: ClientRole.CONSUMER, // Placeholder
        recipientId: userId,
        payload,
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  public broadcastToRole(role: ClientRole, message: Omit<WebSocketMessage, 'timestamp'>) {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.role === role) {
        this.sendToClient(client.socket, {
          ...message,
          timestamp: Date.now()
        });
        count++;
      }
    });
    log(`Broadcast to ${role}: sent to ${count} clients`);
    return count;
  }

  public getActiveConnectionsCount(): { total: number, byRole: Record<ClientRole, number> } {
    const counts = {
      total: this.clients.size,
      byRole: {
        [ClientRole.CONSUMER]: 0,
        [ClientRole.MERCHANT]: 0,
        [ClientRole.DRIVER]: 0
      }
    };

    this.clients.forEach((client) => {
      counts.byRole[client.role]++;
    });

    return counts;
  }
}

// Create and export a singleton instance
let websocketManager: WebSocketManager | null = null;

export function setupWebSocketServer(server: HttpServer): WebSocketManager {
  if (!websocketManager) {
    websocketManager = new WebSocketManager(server);
  }
  return websocketManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return websocketManager;
}